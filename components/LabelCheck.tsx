"use client";

import { useMemo, useState } from "react";
import { FIXTURES } from "@/lib/fixtures";
import {
  PRODUCT_TYPE_LABELS,
  type ApplicationFields,
  type CheckStatus,
  type ProductType,
  type VerifyResult,
} from "@/lib/types";

const EMPTY_APPLICATION: ApplicationFields = {
  brandName: "",
  classType: "",
  alcoholContent: "",
  netContents: "",
  fancifulName: "",
  bottlerNameAddress: "",
  countryOfOrigin: "",
  productType: "distilled_spirits",
};

const STATUS_COPY: Record<
  CheckStatus,
  { title: string; className: string; chip: string }
> = {
  match: {
    title: "Match",
    className: "border-emerald-800 bg-emerald-100 text-emerald-950",
    chip: "bg-emerald-800 text-white",
  },
  fail: {
    title: "Does not match",
    className: "border-red-800 bg-red-100 text-red-950",
    chip: "bg-red-800 text-white",
  },
  needs_review: {
    title: "Needs review",
    className: "border-amber-800 bg-amber-100 text-amber-950",
    chip: "bg-amber-800 text-white",
  },
};

const SAMPLE_EXPECTED: Record<CheckStatus, string> = {
  match: "This sample should come back as Match.",
  fail: "This sample should come back as Does not match.",
  needs_review: "This sample should come back as Needs review.",
};

function fileFromUrl(url: string, filename: string): Promise<File> {
  return fetch(url)
    .then((response) => {
      if (!response.ok) throw new Error("Could not load the sample photo.");
      return response.blob();
    })
    .then(
      (blob) => new File([blob], filename, { type: blob.type || "image/png" }),
    );
}

export function LabelCheck() {
  const [sampleId, setSampleId] = useState("");
  const [file, setFile] = useState<File | null>(null);
  const [preview, setPreview] = useState<string | null>(null);
  const [application, setApplication] =
    useState<ApplicationFields>(EMPTY_APPLICATION);
  const [result, setResult] = useState<VerifyResult | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [checking, setChecking] = useState(false);

  const [fileInputKey, setFileInputKey] = useState(0);

  const canCheck = useMemo(() => {
    if (!file) return false;
    if (!application.brandName.trim()) return false;
    if (!application.classType.trim()) return false;
    if (!application.netContents.trim()) return false;
    if (
      application.productType !== "malt_beverage" &&
      !application.alcoholContent?.trim()
    ) {
      return false;
    }
    return true;
  }, [application, file]);

  const canClear = Boolean(
    sampleId ||
    file ||
    preview ||
    result ||
    error ||
    application.productType !== EMPTY_APPLICATION.productType ||
    application.brandName.trim() ||
    application.classType.trim() ||
    application.alcoholContent?.trim() ||
    application.netContents.trim() ||
    application.fancifulName?.trim() ||
    application.bottlerNameAddress?.trim() ||
    application.countryOfOrigin?.trim(),
  );

  function updateField<K extends keyof ApplicationFields>(
    key: K,
    value: ApplicationFields[K],
  ) {
    setApplication((current) => ({ ...current, [key]: value }));
    setResult(null);
  }

  async function loadSample(id: string) {
    setSampleId(id);
    setError(null);
    setResult(null);

    if (!id) return;

    const fixture = FIXTURES.find((item) => item.id === id);
    if (!fixture) return;

    try {
      const filename = fixture.image.split("/").pop() ?? "label.png";
      const sampleFile = await fileFromUrl(fixture.image, filename);
      setFile(sampleFile);
      setPreview(fixture.image);
      setApplication({
        ...EMPTY_APPLICATION,
        ...fixture.application,
      });
    } catch {
      setError("The sample photo could not be loaded. Please try another one.");
    }
  }

  function onFileChange(next: File | null) {
    setSampleId("");
    setFile(next);
    setResult(null);
    setError(null);
    if (preview?.startsWith("blob:")) URL.revokeObjectURL(preview);
    setPreview(next ? URL.createObjectURL(next) : null);
  }

  function clearAll() {
    if (preview?.startsWith("blob:")) URL.revokeObjectURL(preview);
    setSampleId("");
    setFile(null);
    setPreview(null);
    setApplication({ ...EMPTY_APPLICATION });
    setResult(null);
    setError(null);
    setFileInputKey((key) => key + 1);
  }

  async function onCheck() {
    if (!file || !canCheck) return;
    setChecking(true);
    setError(null);
    setResult(null);

    try {
      const body = new FormData();
      body.set("image", file);
      if (sampleId) body.set("fixtureId", sampleId);
      body.set(
        "application",
        JSON.stringify({
          ...application,
          fancifulName: application.fancifulName || undefined,
          bottlerNameAddress: application.bottlerNameAddress || undefined,
          countryOfOrigin: application.countryOfOrigin || undefined,
          alcoholContent: application.alcoholContent || undefined,
        }),
      );

      const response = await fetch("/api/verify", { method: "POST", body });
      const payload = (await response.json()) as VerifyResult & {
        error?: string;
      };

      if (!response.ok) {
        setError(payload.error ?? "Check did not finish. Try again.");
        return;
      }

      setResult(payload);
    } catch {
      setError("Check did not finish. Try again.");
    } finally {
      setChecking(false);
    }
  }

  const selectedSample = FIXTURES.find((fixture) => fixture.id === sampleId);

  return (
    <div className="flex flex-col gap-10 px-5 py-10 sm:px-8">
      <div className="mx-auto flex w-full max-w-5xl flex-col gap-10">
        <header className="space-y-3">
          <p className="text-sm font-semibold uppercase tracking-[0.18em] text-navy-700">
            Label Check
          </p>
          <h1 className="max-w-3xl text-4xl font-semibold leading-tight text-stone-950 sm:text-5xl">
            Check that a label matches the application.
          </h1>
          <p className="max-w-2xl text-xl leading-relaxed text-stone-800">
            Add the label photo, fill in what is on the application, then press
            Check label.
          </p>
        </header>

        <section className="rounded-2xl border-2 border-stone-300 bg-white p-5 sm:p-6">
          <label
            htmlFor="sample"
            className="mb-2 block text-lg font-semibold text-stone-950"
          >
            Load a sample
          </label>
          <select
            id="sample"
            value={sampleId}
            onChange={(event) => void loadSample(event.target.value)}
            className="min-h-14 w-full rounded-xl border-2 border-stone-400 bg-white px-4 text-lg text-stone-950"
          >
            <option value="">Choose a sample…</option>
            {FIXTURES.map((fixture) => (
              <option key={fixture.id} value={fixture.id}>
                {fixture.title}
              </option>
            ))}
          </select>
          <p className="mt-3 text-lg text-stone-800">
            Samples are known test cases. Use them to try the tool.
          </p>
          {selectedSample ? (
            <div className="mt-4 space-y-2 rounded-xl border-2 border-stone-200 bg-stone-50 px-4 py-3">
              <p className="text-lg leading-relaxed text-stone-800">
                {selectedSample.notes}
              </p>
              <p className="text-lg font-semibold text-stone-950">
                {SAMPLE_EXPECTED[selectedSample.expected.overall]}
              </p>
            </div>
          ) : null}
        </section>

        <div className="grid gap-8 lg:grid-cols-[minmax(0,20rem)_minmax(0,1fr)]">
          <section className="space-y-4">
            <h2 className="text-2xl font-semibold text-stone-950">
              Label photo
            </h2>
            <label className="flex min-h-72 cursor-pointer flex-col items-center justify-center rounded-2xl border-2 border-dashed border-stone-400 bg-white p-4 text-center">
              <input
                key={fileInputKey}
                type="file"
                accept="image/png,image/jpeg,image/webp"
                className="sr-only"
                onChange={(event) =>
                  onFileChange(event.target.files?.[0] ?? null)
                }
              />
              {preview ? (
                // Sample and upload previews are local files, not remote assets.
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={preview}
                  alt="Label preview"
                  className="max-h-96 w-full rounded-lg object-contain"
                />
              ) : (
                <span className="text-xl font-medium text-stone-800">
                  Choose a label photo
                </span>
              )}
            </label>
            <p className="text-base text-stone-700">
              PNG, JPG, or WebP. Up to 4 MB.
            </p>
          </section>

          <section className="space-y-5">
            <h2 className="text-2xl font-semibold text-stone-950">
              Application
            </h2>

            <fieldset>
              <legend className="mb-2 text-lg font-semibold text-stone-950">
                Product type
              </legend>
              <div className="grid grid-cols-3 gap-3">
                {(
                  [
                    "distilled_spirits",
                    "wine",
                    "malt_beverage",
                  ] as ProductType[]
                ).map((type) => {
                  const selected = application.productType === type;
                  return (
                    <label
                      key={type}
                      className={`flex min-h-14 cursor-pointer items-center justify-center rounded-xl border-2 px-3 text-lg font-semibold ${
                        selected
                          ? "border-navy-800 bg-navy-800 text-white"
                          : "border-stone-400 bg-white text-stone-950"
                      }`}
                    >
                      <input
                        type="radio"
                        name="productType"
                        value={type}
                        checked={selected}
                        onChange={() => updateField("productType", type)}
                        className="sr-only"
                      />
                      {PRODUCT_TYPE_LABELS[type]}
                    </label>
                  );
                })}
              </div>
              <p className="mt-3 text-base text-stone-700">
                Wine, beer, or spirits as filed on the application. This is
                checked against the class or type on the label.
              </p>
            </fieldset>

            <Field
              id="brandName"
              label="Brand name"
              value={application.brandName}
              onChange={(value) => updateField("brandName", value)}
              required
            />
            <Field
              id="fancifulName"
              label="Fanciful name (if any)"
              value={application.fancifulName ?? ""}
              onChange={(value) => updateField("fancifulName", value)}
            />
            <Field
              id="classType"
              label="Class / type"
              value={application.classType}
              onChange={(value) => updateField("classType", value)}
              required
            />
            <Field
              id="alcoholContent"
              label="Alcohol content"
              value={application.alcoholContent ?? ""}
              onChange={(value) => updateField("alcoholContent", value)}
              required={application.productType !== "malt_beverage"}
              hint={
                application.productType === "malt_beverage"
                  ? "Optional for beer."
                  : undefined
              }
            />
            <Field
              id="netContents"
              label="Net contents"
              value={application.netContents}
              onChange={(value) => updateField("netContents", value)}
              required
            />
            <Field
              id="bottlerNameAddress"
              label="Bottler name and address"
              value={application.bottlerNameAddress ?? ""}
              onChange={(value) => updateField("bottlerNameAddress", value)}
            />
            <Field
              id="countryOfOrigin"
              label="Country of origin"
              value={application.countryOfOrigin ?? ""}
              onChange={(value) => updateField("countryOfOrigin", value)}
            />
          </section>
        </div>

        <div className="flex flex-col gap-3">
          <div className="flex flex-col gap-3 sm:flex-row">
            <button
              type="button"
              onClick={() => void onCheck()}
              disabled={!canCheck || checking}
              className="min-h-16 flex-1 rounded-2xl bg-navy-800 px-8 text-2xl font-semibold text-white enabled:hover:bg-navy-900 disabled:cursor-not-allowed disabled:bg-stone-400"
            >
              {checking ? "Checking…" : "Check label"}
            </button>
            {canClear ? (
              <button
                type="button"
                onClick={clearAll}
                disabled={checking}
                className="min-h-16 rounded-2xl border-2 border-stone-400 bg-white px-8 text-2xl font-semibold text-stone-950 enabled:hover:bg-stone-100 disabled:cursor-not-allowed disabled:text-stone-400 sm:min-w-48"
              >
                Clear
              </button>
            ) : null}
          </div>
          {!canCheck && (
            <p className="text-lg text-stone-800">
              Add a photo and fill in brand name, class or type, net contents
              {application.productType === "malt_beverage"
                ? "."
                : ", and alcohol content."}
            </p>
          )}
        </div>

        {error && (
          <p
            role="alert"
            className="rounded-2xl border-2 border-red-800 bg-red-100 px-5 py-4 text-xl text-red-950"
          >
            {error}
          </p>
        )}
      </div>

      {result ? (
        <div className="mx-auto w-full max-w-6xl">
          <Results result={result} />
        </div>
      ) : null}
    </div>
  );
}

function Field({
  id,
  label,
  value,
  onChange,
  required,
  hint,
}: {
  id: string;
  label: string;
  value: string;
  onChange: (value: string) => void;
  required?: boolean;
  hint?: string;
}) {
  return (
    <div>
      <label
        htmlFor={id}
        className="mb-2 block text-lg font-semibold text-stone-950"
      >
        {label}
        {required ? " *" : ""}
      </label>
      <input
        id={id}
        value={value}
        onChange={(event) => onChange(event.target.value)}
        required={required}
        className="min-h-14 w-full rounded-xl border-2 border-stone-400 bg-white px-4 text-lg text-stone-950"
      />
      {hint ? <p className="mt-1 text-base text-stone-700">{hint}</p> : null}
    </div>
  );
}

function Results({ result }: { result: VerifyResult }) {
  const overall = STATUS_COPY[result.status];
  const rows = [...result.fields, result.warning];
  const seconds = (result.elapsedMs / 1000).toFixed(1);

  return (
    <section className="space-y-5" aria-live="polite">
      <div className={`rounded-2xl border-2 px-5 py-6 ${overall.className}`}>
        <p className="text-lg font-semibold">{seconds} seconds</p>
        <h2 className="mt-1 text-4xl font-semibold">{overall.title}</h2>
        {result.message ? (
          <p className="mt-3 text-xl leading-relaxed">{result.message}</p>
        ) : null}
      </div>

      {rows.length > 0 && (
        <div className="overflow-x-auto rounded-2xl border-2 border-stone-300 bg-white">
          <table className="w-full table-fixed border-collapse text-left text-lg">
            <colgroup>
              <col className="w-[16%]" />
              <col className="w-[29%]" />
              <col className="w-[29%]" />
              <col className="w-[26%]" />
            </colgroup>
            <thead className="bg-stone-100">
              <tr>
                <th className="px-4 py-3 font-semibold">Field</th>
                <th className="px-4 py-3 font-semibold">Application</th>
                <th className="px-4 py-3 font-semibold">On the label</th>
                <th className="px-4 py-3 font-semibold">Result</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((row) => {
                const copy = STATUS_COPY[row.status];
                return (
                  <tr
                    key={row.field}
                    className="border-t border-stone-200 align-top"
                  >
                    <td className="px-4 py-4 font-semibold wrap-break-word">
                      {row.label}
                    </td>
                    <td className="px-4 py-4 wrap-break-word">
                      {row.applicationValue ?? "—"}
                    </td>
                    <td className="px-4 py-4 wrap-break-word">
                      {row.labelValue ?? "—"}
                    </td>
                    <td className="px-4 py-4 wrap-break-word">
                      <span
                        className={`inline-block rounded-full px-3 py-1 text-base font-semibold ${copy.chip}`}
                      >
                        {copy.title}
                      </span>
                      <p className="mt-2 text-base leading-relaxed text-stone-800">
                        {row.reason}
                      </p>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      <p className="text-sm text-stone-600">
        Checked with {result.provider} ({result.model}).
      </p>
    </section>
  );
}
