import Link from "next/link";
import { ArrowUpRight } from "lucide-react";
import { AUTH_LOGIN_PATH, getDerivSignupUrl } from "@/lib/auth/auth-links";
import { cn } from "@/lib/utils/cn";

interface MarketingAuthButtonsProps {
  size?: "nav" | "lg";
  layout?: "inline" | "stack";
  className?: string;
  onAction?: () => void;
}

export function MarketingAuthButtons({
  size = "nav",
  layout = "inline",
  className,
  onAction,
}: MarketingAuthButtonsProps) {
  const signupHref = getDerivSignupUrl();

  return (
    <div
      className={cn(
        "marketing-auth",
        size === "lg" && "marketing-auth--lg",
        layout === "stack" && "marketing-auth--stack",
        className,
      )}
    >
      <div className="marketing-auth-group">
        <Link href={AUTH_LOGIN_PATH} className="marketing-auth-login" onClick={onAction}>
          Log in
        </Link>
        <a
          href={signupHref}
          className="marketing-auth-signup"
          rel="noopener noreferrer"
          onClick={onAction}
        >
          Sign up
          <ArrowUpRight className="marketing-auth-signup-icon" strokeWidth={2.25} />
        </a>
      </div>
    </div>
  );
}
