import type { ReactNode } from "react";
import ConditionGuard from "@/components/guards/ConditionGuard";
import {
  isFeatureEnabled,
  type FeatureKey,
} from "@/config/features";

export interface FeatureGuardProps {
  feature: FeatureKey;
  children: ReactNode;
  fallback?: ReactNode;
}

/** Wrapper de ConditionGuard ligado a un feature flag de env. */
export default function FeatureGuard({
  feature,
  children,
  fallback = null,
}: FeatureGuardProps) {
  return (
    <ConditionGuard condition={isFeatureEnabled(feature)} fallback={fallback}>
      {children}
    </ConditionGuard>
  );
}
