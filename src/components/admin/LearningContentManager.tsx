"use client";
import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import {
  ArrowUp,
  ArrowDown,
  FileText,
  Film,
  Image as ImageIcon,
  FileArchive,
  Plus,
  BookOpen,
} from "lucide-react";
import { toast } from "sonner";
import { DataTable, type DataTableColumn } from "./DataTable";
import { StatusBadge } from "./StatusBadge";
import { ManagementPageHeader } from "./ManagementPageHeader";
import { ManagementEmpty } from "./ManagementEmpty";
import { ViewerFilters } from "./ViewerFilters";
import { ViewerPagination } from "./ViewerPagination";
import { LearningSelect } from "./LearningSelect";
import { LearningLessonDialog } from "./LearningLessonDialog";
import { LearningResourceDialog } from "./LearningResourceDialog";
import { LearningTrialDialog } from "./LearningTrialDialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import {
  AlertDialog,
  AlertDialogContent,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogCancel,
} from "@/components/ui/alert-dialog";
import type {
  ManagedLesson,
  ManagedResource,
} from "@/lib/schemas/learning-content";
import { AUDIENCE_LABELS, PHASE_LABELS } from "@/lib/learning-content";
import {
  deleteResource,
  reorderLessons,
  reorderResources,
  toggleLesson,
  toggleResource,
} from "@/server/actions/learning-content";

type Row = ManagedLesson | ManagedResource;
const isLesson = (row: Row): row is ManagedLesson => "phase" in row;
const PAGE_SIZE = 20;
export function LearningContentManager({
  domain,
  lessons,
  resources,
  preview,
  showcase = false,
}: {
  domain: "resources" | "lessons";
  lessons: ManagedLesson[];
  resources: ManagedResource[];
  preview: boolean;
  showcase?: boolean;
}) {
  const router = useRouter();
  const [pending, start] = useTransition();
  const [search, setSearch] = useState("");
  const [audience, setAudience] = useState("any");
  const [lessonFilter, setLessonFilter] = useState("any");
  const [page, setPage] = useState(0);
  const [editor, setEditor] = useState<Row | "new" | null>(null);
  const [trialOpen, setTrialOpen] = useState(false);
  const [deleting, setDeleting] = useState<ManagedResource | null>(null);
  const [error, setError] = useState("");
  const [sortTitle, setSortTitle] = useState(false);
  const noun = domain === "resources" ? "tài liệu" : "bài học";
  const allRows: Row[] = domain === "resources" ? resources : lessons;
  const filtered = allRows.filter(
    (r) =>
      r.title
        .toLocaleLowerCase("vi")
        .includes(search.toLocaleLowerCase("vi")) &&
      (isLesson(r) ||
        ((audience === "any" || r.audience === audience) &&
          (lessonFilter === "any" ||
            (lessonFilter === "none"
              ? r.lessonId === null
              : r.lessonId === lessonFilter)))),
  );
  const rows = sortTitle
    ? [...filtered].sort((a, b) => a.title.localeCompare(b.title, "vi"))
    : filtered;
  const currentPage = Math.min(
    page,
    Math.max(0, Math.ceil(rows.length / PAGE_SIZE) - 1),
  );
  const visible = rows.slice(
    currentPage * PAGE_SIZE,
    (currentPage + 1) * PAGE_SIZE,
  );
  function groupKey(row: Row) {
    return isLesson(row) ? row.phase : (row.lessonId ?? "none");
  }
  const groups = Array.from(new Set(visible.map(groupKey)));
  function orderedGroup(row: Row) {
    return allRows
      .filter((r) => groupKey(r) === groupKey(row))
      .sort((a, b) => a.sortOrder - b.sortOrder || a.id.localeCompare(b.id));
  }
  async function toggle(row: Row, active: boolean) {
    const action = isLesson(row) ? toggleLesson : toggleResource;
    const result = await action({
      id: row.id,
      active,
      expectedActive: row.active,
    });
    if (!result.ok) {
      setError(result.error);
      toast.error(result.error);
      return;
    }
    setError("");
    router.refresh();
    toast.success(`${active ? "Đã bật" : "Đã ngừng"} ${row.title}`, {
      duration: 8000,
      action: {
        label: "Hoàn tác",
        onClick: () =>
          start(async () => {
            const undo = await action({
              id: row.id,
              active: row.active,
              expectedActive: active,
            });
            if (!undo.ok) toast.error(undo.error);
            else {
              toast.success(`Đã hoàn tác ${row.title}`);
              router.refresh();
            }
          }),
      },
    });
  }
  function rowActions(row: Row) {
    const ordered = orderedGroup(row);
    const index = ordered.findIndex((r) => r.id === row.id);
    return (
      <div className="flex flex-wrap items-center gap-1">
        <Button
          variant="ghost"
          className="min-h-11"
          onClick={() => setEditor(row)}
        >
          Sửa {noun}
        </Button>
        <Button
          variant="ghost"
          className="min-h-11"
          disabled={preview || pending}
          onClick={() => start(() => toggle(row, !row.active))}
        >
          {row.active ? "Ngừng dùng" : "Bật lại"}
        </Button>
        {(["up", "down"] as const).map((direction) => (
          <Button
            key={direction}
            variant="ghost"
            size="icon"
            className="size-11"
            aria-label={`${direction === "up" ? "Đưa lên" : "Đưa xuống"} ${row.title}`}
            disabled={
              preview ||
              pending ||
              sortTitle ||
              (direction === "up" ? index === 0 : index === ordered.length - 1)
            }
            onClick={() =>
              start(async () => {
                const result = await (
                  isLesson(row) ? reorderLessons : reorderResources
                )({
                  id: row.id,
                  direction,
                  expectedOrder: ordered.map((r) => r.id),
                });
                if (!result.ok) {
                  setError(result.error);
                  toast.error(result.error);
                } else {
                  toast.success(`Đã đổi thứ tự ${row.title}`);
                  router.refresh();
                }
              })
            }
          >
            {direction === "up" ? (
              <ArrowUp aria-hidden="true" strokeWidth={1.75} />
            ) : (
              <ArrowDown aria-hidden="true" strokeWidth={1.75} />
            )}
          </Button>
        ))}
        {!isLesson(row) && (
          <Button
            variant="destructive"
            className="min-h-11"
            disabled={preview || pending}
            onClick={() => setDeleting(row)}
          >
            Xóa tài liệu
          </Button>
        )}
      </div>
    );
  }
  function title(row: Row) {
    const Icon = isLesson(row)
      ? BookOpen
      : { pdf: FileText, image: ImageIcon, youtube: Film, file: FileArchive }[
          row.format
        ];
    return (
      <button
        type="button"
        className="flex min-h-11 min-w-0 items-center gap-2 text-left hover:underline"
        onClick={() => setEditor(row)}
        title={row.title}
      >
        <Icon
          className="size-5 shrink-0"
          aria-hidden="true"
          strokeWidth={1.75}
        />
        {!isLesson(row) && (
          <span className="sr-only">
            {row.format === "youtube"
              ? "Video YouTube"
              : row.format === "pdf"
                ? "Tài liệu PDF"
                : row.format === "image"
                  ? "Hình ảnh"
                  : "Tệp tài liệu"}
            :{" "}
          </span>
        )}
        <span className="max-w-64 break-words">
          {isLesson(row) && (
            <span className="font-mono text-xs">
              {row.lessonNumbers.join("/")} ·{" "}
            </span>
          )}
          {row.title}
        </span>
      </button>
    );
  }
  function details(row: Row) {
    return isLesson(row) ? (
      <div className="flex flex-wrap items-center gap-2">
        <span className="font-mono tabular-nums">
          {row.baseDays ?? "—"} ngày
        </span>
        {row.trialOrder !== null && (
          <Badge variant="warning">Học thử {row.trialOrder}</Badge>
        )}
        <span className="text-xs text-muted-foreground">
          {row.resourceCount} tài liệu · {row.planCount} kế hoạch
        </span>
      </div>
    ) : (
      <div className="flex flex-wrap items-center gap-2">
        <StatusBadge
          context="learning"
          status={row.audience === "trial" ? "trial-audience" : row.audience}
        />
        <span>{row.mode === "view" ? "Chỉ xem" : "Cho tải"}</span>
        <span className="font-mono text-xs tabular-nums">
          {row.size === null
            ? "Chưa rõ dung lượng"
            : `${(row.size / 1024 / 1024).toLocaleString("vi-VN", { maximumFractionDigits: 1 })} MB`}
        </span>
      </div>
    );
  }
  const columns: DataTableColumn<Row>[] = [
    {
      id: "title",
      header: () => (
        <Button
          variant="ghost"
          onClick={() => {
            setSortTitle(!sortTitle);
            setPage(0);
          }}
        >
          Tên {noun} {sortTitle ? "↑" : ""}
        </Button>
      ),
      cell: ({ row }) => title(row.original),
    },
    {
      id: "details",
      header: "Thông tin",
      cell: ({ row }) => details(row.original),
    },
    {
      id: "active",
      header: "Trạng thái",
      cell: ({ row }) => (
        <StatusBadge
          context="learning"
          status={row.original.active ? "active" : "inactive"}
        />
      ),
    },
    {
      id: "actions",
      header: "Thao tác",
      cell: ({ row }) => rowActions(row.original),
    },
  ];
  const filterCount =
    Number(audience !== "any") + Number(lessonFilter !== "any");
  const filters = (prefix: string) => (
    <>
      <LearningSelect
        id={`${prefix}-audience`}
        label="Đối tượng"
        value={audience}
        options={[
          { value: "any", label: "Mọi đối tượng" },
          ...Object.entries(AUDIENCE_LABELS).map(([value, label]) => ({
            value,
            label,
          })),
        ]}
        onChange={(value) => {
          setAudience(value);
          setPage(0);
        }}
      />
      <LearningSelect
        id={`${prefix}-lesson`}
        label="Bài học"
        value={lessonFilter}
        options={[
          { value: "any", label: "Mọi bài học" },
          { value: "none", label: "Không gắn bài học" },
          ...lessons.map((l) => ({ value: l.id, label: l.title })),
        ]}
        onChange={(value) => {
          setLessonFilter(value);
          setPage(0);
        }}
      />
    </>
  );
  const Container = showcase ? "div" : "main";
  return (
    <Container className="content space-y-6 py-8 sm:py-10">
      <ManagementPageHeader
        eyebrow="QUẢN LÝ · HỌC TẬP"
        title={domain === "resources" ? "Tài liệu" : "Chương trình học"}
        helper={domain === "resources"
          ? "Quản lý tài liệu và video theo từng bài học."
          : "Điều chỉnh bài học cho các kế hoạch mở sau này."}
        action={<Button className="min-h-11" onClick={() => setEditor("new")}>
          <Plus aria-hidden="true" strokeWidth={1.75} />Thêm {noun}
        </Button>}
      />
      {preview && (
        <p className="rounded-xl border border-dashed p-3 text-sm text-muted-foreground">
          Chế độ xem thử: Bạn có thể xem biểu mẫu; thay đổi chưa được lưu.
        </p>
      )}
      <div className="grid gap-4 md:grid-cols-3">
        <div className="grid gap-2">
          <Label htmlFor="content-search">Tìm tên {noun}</Label>
          <Input
            id="content-search"
            value={search}
            maxLength={200}
            onChange={(e) => {
              setSearch(e.target.value);
              setPage(0);
            }}
          />
        </div>
        {domain === "resources" && (
          <ViewerFilters count={filterCount} title="Bộ lọc tài liệu" description="Chọn đối tượng và bài học.">
            {filters}
          </ViewerFilters>
        )}
        {domain === "lessons" && (
          <div className="flex items-end">
            <Button
              variant="outline"
              className="min-h-11"
              onClick={() => setTrialOpen(true)}
            >
              Đổi bài học thử
            </Button>
          </div>
        )}
      </div>
      <p role="status" aria-live="polite" className="text-sm text-destructive">
        {pending ? "Đang lưu thay đổi…" : error}
        {error && (
          <Button
            variant="outline"
            className="ml-2 min-h-11"
            onClick={() => {
              setError("");
              router.refresh();
            }}
          >
            Thử tải lại
          </Button>
        )}
      </p>
      {visible.length ? (
        groups.map((key) => (
          <section
            key={key}
            className="min-w-0 space-y-3"
            aria-label={
              domain === "lessons"
                ? PHASE_LABELS[key as keyof typeof PHASE_LABELS]
                : (lessons.find((l) => l.id === key)?.title ??
                  "Không gắn bài học")
            }
          >
            <h2 className="break-words font-heading text-lg font-medium">
              {domain === "lessons"
                ? PHASE_LABELS[key as keyof typeof PHASE_LABELS]
                : (lessons.find((l) => l.id === key)?.title ??
                  "Không gắn bài học")}
            </h2>
            <DataTable
              presentation="wide"
              label={
                domain === "resources"
                  ? "Danh sách tài liệu"
                  : "Danh sách bài học"
              }
              columns={columns}
              data={visible.filter((r) => groupKey(r) === key)}
              rowKey={(r) => r.id}
              mobileCards={(row) => (
                <article className="min-w-0 space-y-3 rounded-2xl border bg-card p-4">
                  {title(row)}
                  {details(row)}
                  <StatusBadge
                    context="learning"
                    status={row.active ? "active" : "inactive"}
                  />
                  {rowActions(row)}
                </article>
              )}
            />
          </section>
        ))
      ) : (
        <ManagementEmpty>
          <h2 className="mt-4 text-lg font-medium">Chưa có {noun} phù hợp</h2>
          <p className="mt-2 text-sm text-muted-foreground">
            {allRows.length
              ? "Bạn bỏ bộ lọc để xem các mục khác."
              : `Thêm ${noun} đầu tiên để học viên bắt đầu học.`}
          </p>
          <Button
            variant="outline"
            className="mt-4 min-h-11"
            onClick={() => {
              if (allRows.length) {
                setSearch("");
                setAudience("any");
                setLessonFilter("any");
              } else setEditor("new");
            }}
          >
            {allRows.length ? "Bỏ bộ lọc" : `Thêm ${noun}`}
          </Button>
        </ManagementEmpty>
      )}
      <ViewerPagination
        total={rows.length}
        page={currentPage + 1}
        size={PAGE_SIZE}
        onPageChange={(next) => setPage(next - 1)}
      />
      {editor !== null &&
        (domain === "lessons" ? (
          <LearningLessonDialog
            key={editor === "new" ? "new" : editor.id}
            lesson={editor === "new" ? null : (editor as ManagedLesson)}
            preview={preview}
            onClose={() => setEditor(null)}
          />
        ) : (
          <LearningResourceDialog
            key={editor === "new" ? "new" : editor.id}
            resource={editor === "new" ? null : (editor as ManagedResource)}
            lessons={lessons}
            preview={preview}
            onClose={() => setEditor(null)}
          />
        ))}
      {trialOpen && (
        <LearningTrialDialog
          lessons={lessons}
          preview={preview}
          onClose={() => setTrialOpen(false)}
        />
      )}
      <AlertDialog
        open={deleting !== null}
        onOpenChange={(open) => {
          if (!open && !pending) setDeleting(null);
        }}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>
              Xóa tài liệu “{deleting?.title}”?
            </AlertDialogTitle>
            <AlertDialogDescription>
              Liên kết tài liệu sẽ ngừng hoạt động. Học viên có thể đang mở tài
              liệu này. Bạn không thể hoàn tác việc xóa.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={pending}>
              Giữ tài liệu
            </AlertDialogCancel>
            <Button
              variant="destructive"
              disabled={pending || preview}
              onClick={() =>
                start(async () => {
                  if (!deleting) return;
                  const result = await deleteResource({ id: deleting.id });
                  if (!result.ok) {
                    setError(result.error);
                    toast.error(result.error);
                    return;
                  }
                  toast.success(`Đã xóa tài liệu ${deleting.title}`);
                  if (result.data.cleanupPending)
                    toast.error(
                      "Tệp lưu trữ chưa được dọn. Bạn báo quản trị viên nhé.",
                    );
                  setDeleting(null);
                  router.refresh();
                })
              }
            >
              {pending ? "Đang xóa tài liệu…" : "Xóa tài liệu"}
            </Button>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </Container>
  );
}
