import { Download, FileQuestion } from "lucide-react";
import { Button } from "@/components/ui/button";
import type { MyResource } from "@/lib/schemas/student-area";

/**
 * Shows a resource without handing the student a file link (FRONTEND_RULES §5): videos are
 * embedded, PDFs and images are streamed inline by /api/student/resources/<id>. Downloads exist
 * only for software installers.
 */
export function ResourceViewer({ resource }: { resource: MyResource }) {
  const src = `/api/student/resources/${resource.id}`;
  if (resource.mode === "download") {
    return (
      <Button asChild variant="outline" className="h-auto min-h-11 justify-start py-2 text-left whitespace-normal">
        <a href={src} download>
          <Download aria-hidden strokeWidth={1.75} />Tải {resource.title}
        </a>
      </Button>
    );
  }
  if (resource.format === "youtube" && resource.embedUrl) {
    return (
      <div className="aspect-video w-full overflow-hidden rounded-[4px] border border-border bg-muted">
        <iframe
          src={`${resource.embedUrl}?rel=0&modestbranding=1`}
          title={resource.title}
          loading="lazy"
          referrerPolicy="strict-origin-when-cross-origin"
          allow="fullscreen; picture-in-picture"
          allowFullScreen
          className="size-full"
        />
      </div>
    );
  }
  if (resource.format === "pdf") {
    return (
      <iframe
        src={`${src}#toolbar=0&navpanes=0`}
        title={resource.title}
        loading="lazy"
        className="h-[70dvh] min-h-96 w-full rounded-[4px] border border-border bg-muted"
      />
    );
  }
  if (resource.format === "image") {
    // eslint-disable-next-line @next/next/no-img-element -- private, streamed per request; next/image would cache it publicly
    return <img src={src} alt={resource.title} loading="lazy" className="w-full rounded-[4px] border border-border" />;
  }
  return (
    <p className="flex items-center gap-2 rounded-[4px] border border-border bg-card p-4 text-sm text-muted-foreground">
      <FileQuestion aria-hidden size={18} strokeWidth={1.75} />Định dạng này chưa xem trực tuyến được. Bạn hỏi RVPY để được hỗ trợ.
    </p>
  );
}
