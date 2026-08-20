"use client";

import Link from "next/link";
import {
  AUTH_LOGIN_PATH,
  DERIV_EXTERNAL_LINK,
  getDerivSignupUrl,
} from "@/lib/auth/auth-links";
import { cn } from "@/lib/utils/cn";

interface TraderAuthLinksProps {
  loginLabel?: string;
  signupLabel?: string;
  className?: string;
}

/** Trader identity is Deriv: Log in → TradeCity /login (OAuth), Sign up → TradersHub. */
export function TraderAuthLinks({
  loginLabel = "Log in",
  signupLabel = "Sign up",
  className,
}: TraderAuthLinksProps) {
  return (
    <p className={cn("tc-trader-auth", className)}>
      <Link href={AUTH_LOGIN_PATH} className="tc-trader-auth-login">
        {loginLabel}
      </Link>
      <a
        href={getDerivSignupUrl()}
        className="tc-trader-auth-signup"
        {...DERIV_EXTERNAL_LINK}
      >
        {signupLabel}
      </a>
    </p>
  );
}
