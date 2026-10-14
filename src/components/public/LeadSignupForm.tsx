"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { useRouter } from "next/navigation";
import { useCallback, useState } from "react";
import { useForm, useWatch, type FieldPath } from "react-hook-form";
import type { z } from "zod";
import { ChevronDown } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuRadioGroup,
  DropdownMenuRadioItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { leadSignupSchema, type LeadSignupInput } from "@/lib/schemas/lead";
import { LEAD_CHANNEL_OPTIONS, OCCUPATION_OPTIONS } from "@/lib/constants";
import { submitLeadSignup } from "@/server/actions/leads";
import { SignupVerification } from "@/components/public/SignupVerification";

const FIELDS = [
  {
    name: "fullName",
    label: "Họ và tên",
    autoComplete: "name",
    placeholder: "Nguyễn Minh An",
    required: true,
  },
  {
    name: "hometown",
    label: "Quê quán (Tỉnh / thành phố)",
    placeholder: "TP. HCM, Đồng Nai, Bình Dương, Cần Thơ…",
    required: true,
  },
  {
    name: "phone",
    label: "Số điện thoại Zalo",
    type: "tel",
    autoComplete: "tel-national",
    placeholder: "0969 071 561",
    required: true,
  },
  {
    name: "specialty",
    label: "Chuyên ngành",
    placeholder: "Kiến trúc, Quy hoạch, Nội thất, Kết cấu, MEP…",
    required: true,
  },
  {
    name: "occupation",
    label: "Nghề nghiệp",
    placeholder: "Chọn nghề nghiệp",
    required: true,
  },
  {
    name: "organization",
    label: "Đơn vị công tác, học tập",
    autoComplete: "organization",
    placeholder: "UAH, HAU, MUCE, Ocean Studio,...",
    required: true,
  },
  {
    name: "facebookLink",
    label: "Link Facebook",
    type: "url",
    autoComplete: "url",
    placeholder: "https://www.facebook.com/ten-cua-ban",
    required: true,
  },
  {
    name: "email",
    label: "Gmail nhận giáo trình, bài thu hoạch và clip",
    type: "email",
    autoComplete: "email",
    placeholder: "ban@gmail.com",
    required: true,
    help: "RVPY dùng Gmail này để gửi tài liệu khóa học.",
  },
] as const;

export function LeadSignupForm({
  sourceCode,
  referrerCode,
}: {
  sourceCode?: string;
  referrerCode?: string;
}) {
  const router = useRouter();
  const [verificationReset, setVerificationReset] = useState(0);
  const {
    register,
    control,
    handleSubmit,
    setError,
    setValue,
    formState: { errors, isSubmitting },
  } = useForm<LeadSignupInput, unknown, z.output<typeof leadSignupSchema>>({
    resolver: zodResolver(leadSignupSchema),
    defaultValues: {
      fullName: "",
      hometown: "",
      phone: "",
      email: "",
      specialty: "",
      organization: "",
      facebookLink: "",
      sourceCode,
      referrerCode,
      answers: {},
    },
  });
  const heardAbout = useWatch({ control, name: "answers.heardAbout" });
  const occupation = useWatch({ control, name: "occupation" });
  const captchaToken = useWatch({ control, name: "captchaToken" });
  const onVerification = useCallback((token: string) => setValue("captchaToken", token), [setValue]);
  const verificationRequired = Boolean(process.env.NEXT_PUBLIC_TURNSTILE_SITE_KEY) || process.env.NODE_ENV === "production";

  const renderField = ({ name, label, ...options }: (typeof FIELDS)[number]) => {
    const help = "help" in options ? options.help : undefined;
    const required = "required" in options && options.required;
    const error = errors[name]?.message;

    if (name === "occupation") {
      return (
        <div key={name} className="grid content-start gap-2">
          <Label htmlFor={name === "occupation" ? "occupation-select" : name}>
            {label}
            {required ? " *" : ""}
          </Label>
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button
                id="occupation-select"
                type="button"
                variant="outline"
                aria-required={required}
                aria-invalid={Boolean(error)}
                aria-describedby={error ? `${name}-error` : undefined}
                className="w-full justify-between font-normal"
              >
                <span className={occupation ? undefined : "text-muted-foreground"}>
                  {occupation || options.placeholder}
                </span>
                <ChevronDown aria-hidden="true" className="size-4 text-muted-foreground" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="start">
              <DropdownMenuRadioGroup
                value={occupation ?? ""}
                onValueChange={(value) =>
                  setValue("occupation", value as (typeof OCCUPATION_OPTIONS)[number], {
                    shouldDirty: true,
                    shouldValidate: true,
                  })
                }
              >
                {OCCUPATION_OPTIONS.map((option) => (
                  <DropdownMenuRadioItem key={option} value={option}>
                    {option}
                  </DropdownMenuRadioItem>
                ))}
              </DropdownMenuRadioGroup>
            </DropdownMenuContent>
          </DropdownMenu>
          {error ? (
            <p id={`${name}-error`} role="alert" className="text-sm text-destructive">
              {error}
            </p>
          ) : null}
        </div>
      );
    }

    return (
      <div key={name} className="grid content-start gap-2">
        <Label htmlFor={name}>
          {label}
          {required ? " *" : ""}
        </Label>
        <Input
          id={name}
          type={"type" in options ? options.type : "text"}
          autoComplete={"autoComplete" in options ? options.autoComplete : "off"}
          placeholder={options.placeholder}
          maxLength={name === "phone" ? 30 : name === "email" ? 254 : name === "facebookLink" ? 500 : 200}
          aria-required={required}
          aria-invalid={Boolean(error)}
          aria-describedby={error ? `${name}-error` : help ? `${name}-help` : undefined}
          {...register(name)}
        />
        {help ? (
          <p id={`${name}-help`} className="text-xs text-muted-foreground">{help}</p>
        ) : null}
        {error ? (
          <p id={`${name}-error`} role="alert" className="text-sm text-destructive">{error}</p>
        ) : null}
      </div>
    );
  };

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
    } finally {
      setValue("captchaToken", "");
      setVerificationReset((current) => current + 1);
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
        {FIELDS.slice(0, 3).map(renderField)}
        <div className="grid content-start gap-2">
          <Label htmlFor="birthYear">Năm sinh *</Label>
          <Input
            id="birthYear"
            type="number"
            inputMode="numeric"
            min={1900}
            max={new Date().getFullYear()}
            placeholder="1995"
            aria-required="true"
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
        {FIELDS.slice(3).map(renderField)}
        <div className="grid gap-2 sm:col-span-2">
          <Label htmlFor="heardAbout">Bạn biết đến RVPY qua ai hay kênh nào?</Label>
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button
                id="heardAbout"
                type="button"
                variant="outline"
                className="w-full justify-between font-normal"
              >
                <span className={heardAbout ? undefined : "text-muted-foreground"}>
                  {heardAbout || "Chọn nếu bạn muốn trả lời"}
                </span>
                <ChevronDown aria-hidden="true" className="size-4 text-muted-foreground" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="start" className="max-h-72">
              <DropdownMenuRadioGroup
                value={heardAbout ?? ""}
                onValueChange={(value) =>
                  setValue("answers.heardAbout", value, {
                    shouldDirty: true,
                    shouldValidate: true,
                  })
                }
              >
                {LEAD_CHANNEL_OPTIONS.map((option) => (
                  <DropdownMenuRadioItem key={option} value={option}>
                    {option}
                  </DropdownMenuRadioItem>
                ))}
              </DropdownMenuRadioGroup>
            </DropdownMenuContent>
          </DropdownMenu>
          {heardAbout === "Khác" || heardAbout === "Được người khác giới thiệu" ? (
            <div className="grid gap-2">
              <Label htmlFor="heardAboutOther">
                {heardAbout === "Khác" ? "Bạn biết đến RVPY qua đâu? *" : "Tên người giới thiệu *"}
              </Label>
              <Input
                id="heardAboutOther"
                maxLength={200}
                placeholder={heardAbout === "Khác" ? "Nhập nguồn bạn biết đến RVPY" : "Nhập họ tên người giới thiệu"}
                aria-required="true"
                aria-invalid={Boolean(errors.answers?.heardAboutOther)}
                aria-describedby={errors.answers?.heardAboutOther ? "heardAboutOther-error" : undefined}
                {...register("answers.heardAboutOther")}
              />
              {errors.answers?.heardAboutOther ? (
                <p id="heardAboutOther-error" role="alert" className="text-sm text-destructive">
                  {errors.answers.heardAboutOther.message}
                </p>
              ) : null}
            </div>
          ) : null}
        </div>
        <div className="grid gap-2 sm:col-span-2">
          <Label htmlFor="learningGoal">
            Bạn mong muốn RVPY đào tạo những nội dung nào cho công việc và học tập?
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
      <SignupVerification onToken={onVerification} resetKey={verificationReset} />
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
        disabled={isSubmitting || (verificationRequired && !captchaToken)}
        className="w-full"
        aria-busy={isSubmitting}
      >
        {isSubmitting ? "Đang gửi đăng ký…" : "Đăng ký 3 buổi học thử miễn phí"}
      </Button>
    </form>
  );
}
