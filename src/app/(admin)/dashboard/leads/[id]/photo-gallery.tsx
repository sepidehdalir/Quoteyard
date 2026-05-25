import type { LeadFile } from '@/lib/queries/leads';

interface Props {
  files: ReadonlyArray<LeadFile>;
  /** Map of `storagePath -> signedUrl`. Missing entries render as a placeholder. */
  signedUrls: ReadonlyMap<string, string>;
}

export function PhotoGallery({ files, signedUrls }: Props) {
  if (files.length === 0) {
    return (
      <p className="text-sm text-slate-500">
        No photos attached to this lead.
      </p>
    );
  }

  return (
    <ul className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
      {files.map((file) => {
        const url = signedUrls.get(file.storagePath);
        return (
          <li
            key={file.id}
            className="overflow-hidden rounded-md border border-slate-200 bg-white"
          >
            {url ? (
              <a
                href={url}
                target="_blank"
                rel="noopener noreferrer"
                className="block focus-visible:ring-2 focus-visible:ring-slate-900 focus-visible:outline-none"
                title={`${file.fileName} (${formatBytes(file.sizeBytes)})`}
              >
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={url}
                  alt={file.fileName}
                  loading="lazy"
                  className="aspect-square w-full object-cover"
                />
              </a>
            ) : (
              <div
                className="flex aspect-square w-full items-center justify-center bg-slate-50 text-xs text-slate-400"
                title={`${file.fileName} (unavailable)`}
              >
                Unavailable
              </div>
            )}
            <div className="border-t border-slate-100 px-2 py-1.5 text-[11px] text-slate-500">
              <div className="truncate" title={file.fileName}>
                {file.fileName}
              </div>
              <div className="text-slate-400">
                {formatBytes(file.sizeBytes)}
              </div>
            </div>
          </li>
        );
      })}
    </ul>
  );
}

function formatBytes(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(0)} KB`;
  return `${(bytes / 1024 / 1024).toFixed(1)} MB`;
}
