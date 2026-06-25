"use client";

/* =============================================================================
   Care Plan — legacy import path (THIN RE-EXPORT SHIM).

   The care-plan domain now lives in src/features/care-plan/domain. This file is
   retained only so existing importers of "@/components/CarePlan/carePlanModel"
   keep compiling unchanged. Every symbol that was exported from here historically
   (types, label/tone maps, pure selectors, the store hooks + imperative writers,
   and the medication API) is re-exported from the domain barrel below.

   New code should import from "@/features/care-plan/domain" directly.
   ============================================================================= */

export * from "@/features/care-plan/domain";
