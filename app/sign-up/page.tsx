import { redirect } from "next/navigation";

/** 회원가입은 인증 화면의 가입 모드를 재사용한다. */
export default function SignUpPage() {
  redirect("/sign-in?mode=register");
}
