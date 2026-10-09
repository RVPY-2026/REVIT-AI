"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { useRouter } from "next/navigation";
import { useForm, type FieldPath } from "react-hook-form";
import type { z } from "zod";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { leadSignupSchema, type LeadSignupInput } from "@/lib/schemas/lead";
import { submitLeadSignup } from "@/server/actions/leads";

const FIELDS = [
  {
    name: "fullName",
    label: "Họ và tên",
    autoComplete: "name",
    placeholder: "Nguyễn Minh An",
    required: true,
  },
  {
    name: "phone",
    label: "Số điện thoại Zalo",
    type: "tel",
    autoComplete: "tel-national",
    placeholder: "0901 234 567",
    required: true,
  },
  {
    name: "email",
    label: "Gmail",
    type: "email",
    autoComplete: "email",
    placeholder: "ban@gmail.com",
    required: true,
    help: "Dùng Gmail này để đăng nhập khi tài khoản được kích hoạt.",
  },
  {
    name: "occupation",
    label: "Nghề nghiệp",
    autoComplete: "organization-title",
    placeholder: "Kiến trúc sư, kỹ sư…",
    required: true,
  },
  {
    name: "specialty",
    label: "Chuyên ngành",
    placeholder: "Kiến trúc, kết cấu, MEP…",
  },
  {
    name: "organization",
    label: "Đơn vị đang làm việc",
    autoComplete: "organization",
    placeholder: "Tên công ty hoặc đơn vị",
  },
  { name: "hometown", label: "Quê quán", placeholder: "Tỉnh / thành phố" },
] as const;

export function LeadSignupForm({
  sourceCode,
  referrerCode,
}: {
  sourceCode?: string;
  referrerCode?: string;
}) {
  const router = useRouter();
  const {
    register,
    handleSubmit,
    setError,
    formState: { errors, isSubmitting },
  } = useForm<LeadSignupInput, unknown, z.output<typeof leadSignupSchema>>({
    resolver: zodResolver(leadSignupSchema),
    defaultValues: {
      fullName: "",
      phone: "",
      email: "",
      occupation: "",
      sourceCode,
      referrerCode,
      answers: {},
    },
  });

  const onSubmit = handleSubmit(async (values) => {
    try {
      const result = await submitLeadSignup(values);
      if (!result.ok) {
        setError("root", { message: result.error });
        for (const [field, messages] of Object.entries(
          result.fieldErrors ?? {},
        )) {
          if (messages?.[0] && field in values)
            setError(field as FieldPath<LeadSignupInput>, {
              message: messages[0],
            });
        }
        return;
      }
      router.push(
        `/dang-ky/thanh-cong?code=${encodeURIComponent(result.data.code)}`,
      );
    } catch {
      setError("root", {
        message: "Chưa gửi được đăng ký. Bạn kiểm tra kết nối rồi thử lại nhé.",
      });
    }
  });

  return (
    <form onSubmit={onSubmit} noValidate className="grid gap-6">
      <p className="text-sm text-muted-foreground">
        Các mục có dấu * là bắt buộc.
      </p>
      <fieldset
        disabled={isSubmitting}
        className="grid min-w-0 gap-6 sm:grid-cols-2"
      >
        <legend className="sr-only">Thông tin đăng ký học thử</legend>
        {FIELDS.map(({ name, label, ...options }) => {
          const help = "help" in options ? options.help : undefined;
          const required = "required" in options && options.required;
          const error = errors[name]?.message;
          return (
            <div key={name} className="grid content-start gap-2">
              <Label htmlFor={name}>
                {label}
                {required ? " *" : ""}
              </Label>
              <Input
                id={name}
                type={"type" in options ? options.type : "text"}
                autoComplete={
                  "autoComplete" in options ? options.autoComplete : "off"
                }
                placeholder={options.placeholder}
                maxLength={name === "phone" ? 30 : name === "email" ? 254 : 200}
                aria-required={required}
                aria-invalid={Boolean(error)}
                aria-describedby={
                  error ? `${name}-error` : help ? `${name}-help` : undefined
                }
                {...register(name)}
              />
              {help ? (
                <p
                  id={`${name}-help`}
                  className="text-xs text-muted-foreground"
                >
                  {help}
                </p>
              ) : null}
              {error ? (
                <p
                  id={`${name}-error`}
                  role="alert"
                  className="text-sm text-destructive"
                >
                  {error}
                </p>
              ) : null}
            </div>
          );
        })}
        <div className="grid content-start gap-2">
          <Label htmlFor="birthYear">Năm sinh</Label>
          <Input
            id="birthYear"
            type="number"
            inputMode="numeric"
            min={1900}
            max={new Date().getFullYear()}
            placeholder="1995"
            aria-invalid={Boolean(errors.birthYear)}
            aria-describedby={errors.birthYear ? "birthYear-error" : undefined}
            {...register("birthYear", {
              setValueAs: (value) => (value === "" ? undefined : Number(value)),
            })}
          />
          {errors.birthYear ? (
            <p
              id="birthYear-error"
              role="alert"
              className="text-sm text-destructive"
            >
              {errors.birthYear.message}
            </p>
          ) : null}
        </div>
        <div className="grid gap-2 sm:col-span-2">
          <Label htmlFor="heardAbout">Bạn biết đến RVPY qua đâu?</Label>
          <Input
            id="heardAbout"
            maxLength={200}
            placeholder="Facebook, bạn bè giới thiệu…"
            {...register("answers.heardAbout")}
          />
        </div>
        <div className="grid gap-2 sm:col-span-2">
          <Label htmlFor="learningGoal">
            Bạn muốn ứng dụng Revit vào công việc nào?
          </Label>
          <Textarea
            id="learningGoal"
            rows={3}
            maxLength={4000}
            placeholder="Chia sẻ kinh nghiệm hiện tại và mục tiêu học của bạn"
            {...register("answers.learningGoal")}
          />
        </div>
      </fieldset>
      {errors.root?.message ? (
        <p
          role="alert"
          className="rounded-lg border border-destructive/30 p-3 text-sm text-destructive"
        >
          {errors.root.message}
        </p>
      ) : null}
      <p className="text-sm text-muted-foreground">
        RVPY dùng thông tin này để liên hệ tư vấn và sắp xếp học thử. Đăng ký
        học thử không yêu cầu thanh toán.
      </p>
      <Button
        type="submit"
        size="lg"
        disabled={isSubmitting}
        className="w-full"
        aria-busy={isSubmitting}
      >
        {isSubmitting ? "Đang gửi đăng ký…" : "Đăng ký 3 buổi học thử miễn phí"}
      </Button>
    </form>
  );
}
