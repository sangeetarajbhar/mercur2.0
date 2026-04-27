import { zodResolver } from "@hookform/resolvers/zod";
import {
  Button,
  toast,
  FocusModal,
  Input,
  Label,
  Heading,
  Text,
  DropdownMenu,
  clx,
} from "@medusajs/ui";
import { ChevronDown, XMarkMini } from "@medusajs/icons";
import { FormProvider, useForm } from "react-hook-form";
import { useTranslation } from "react-i18next";
import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { z } from "zod";

import { useCreateTier, useUpdateTier } from "../../../hooks/api/tiers";
import { usePromotionsInfinite } from "../../../hooks/api/promotions";
import { Tier } from "../types";

type PromotionOption = { id: string; code?: string; status?: string };

const TierFormSchema = z.object({
  name: z.string().min(1, "Tier name is required"),
  promo_id: z.string().nullable().optional(),
});

type TierFormData = z.infer<typeof TierFormSchema>;

const DEFAULT_CURRENCY = "inr" as const;

interface TierFormModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess?: (tierId?: string) => void;
  tier?: Tier;
  isEdit?: boolean;
}

const TierFormModal = ({
  open,
  onOpenChange,
  onSuccess,
  tier,
  isEdit = false,
}: TierFormModalProps) => {
  const { t } = useTranslation();
  const navigate = useNavigate();

  const getDefaultValues = (): TierFormData => {
    if (isEdit && tier) {
      return {
        name: tier.name || "",
        promo_id: tier.promo_id || null,
      };
    }
    return {
      name: "",
      promo_id: null,
    };
  };

  const form = useForm<TierFormData>({
    defaultValues: getDefaultValues(),
    resolver: zodResolver(TierFormSchema),
  });

  useEffect(() => {
    if (open) {
      form.reset(getDefaultValues());
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [tier, isEdit, open]);

  const { mutateAsync: createTier, isPending: isCreating } = useCreateTier();
  const { mutateAsync: updateTier, isPending: isUpdating } = useUpdateTier(
    tier?.id || ""
  );

  const {
    promotions,
    hasNextPage,
    loading: loadingMore,
    initialLoading: promotionsLoading,
    lastItemRef,
  } = usePromotionsInfinite(50);

  const [promoSearch, setPromoSearch] = useState("");
  const [promoOpen, setPromoOpen] = useState(false);

  const filteredPromotions = useMemo(() => {
    const q = promoSearch.trim().toLowerCase();
    if (!q) return promotions;
    return promotions.filter((p: PromotionOption) => {
      const label = `${p.code ?? ""} ${p.status ?? ""}`.toLowerCase();
      return label.includes(q);
    });
  }, [promotions, promoSearch]);

  const isLoading = isCreating || isUpdating;

  const handleClose = () => {
    form.reset();
    onOpenChange(false);
  };

  const handleSubmit = async () => {
    const nameValid = await form.trigger("name");
    if (!nameValid) {
      const nameError = form.formState.errors.name?.message;
      toast.error(nameError || "Tier name is required");
      return;
    }

    const tierRules = !isEdit
      ? [{ min_purchase_value: 0, currency_code: DEFAULT_CURRENCY }]
      : undefined;

    const formData = {
      ...form.getValues(),
      tier_rules: tierRules,
    };

    try {
      if (isEdit && tier) {
        await updateTier({
          name: formData.name,
          promo_id: formData.promo_id || null,
        });
        toast.success("Tier updated successfully");
        form.reset();
        onOpenChange(false);
        onSuccess?.();
      } else {
        const result = await createTier(formData);
        toast.success("Tier created successfully");
        form.reset();
        onOpenChange(false);
        if (result?.tier?.id) {
          navigate(`/tiers/${result.tier.id}`);
        }
        onSuccess?.(result?.tier?.id);
      }
    } catch (err) {
      const message =
        (err as Error)?.message ||
        `Failed to ${isEdit ? "update" : "create"} tier`;
      toast.error(message);
    }
  };

  const selectedPromoId = form.watch("promo_id");

  return (
    <FormProvider {...form}>
      <form>
        <FocusModal open={open} onOpenChange={handleClose}>
          <FocusModal.Content>
            <FocusModal.Header>
              <Heading level="h2">
                {isEdit ? "Edit Tier" : "Create Tier"}
              </Heading>
            </FocusModal.Header>

            <FocusModal.Body className="flex flex-1 flex-col items-center overflow-y-auto">
              <div className="flex w-full max-w-[720px] flex-col gap-y-8 px-2 py-16">
                <div>
                  <Heading className="capitalize mb-2">Tier Details</Heading>
                  <Text size="small" className="text-ui-fg-muted">
                    Configure the basic tier information
                  </Text>
                </div>

                <div className="flex flex-col gap-y-6">
                  <div className="flex flex-col gap-y-2">
                    <Label
                      htmlFor="name"
                      className="text-ui-fg-subtle text-small font-medium"
                    >
                      Tier Name *
                    </Label>
                    <Input
                      id="name"
                      {...form.register("name")}
                      placeholder="e.g., Bronze, Silver, Gold"
                    />
                    {form.formState.errors.name && (
                      <Text className="text-small" style={{ color: "#ef4444" }}>
                        {form.formState.errors.name.message}
                      </Text>
                    )}
                  </div>

                  <div className="flex flex-col gap-y-2">
                    <Label
                      htmlFor="promo_id"
                      className="text-ui-fg-subtle text-small font-medium"
                    >
                      Promotion (Optional)
                    </Label>
                    <DropdownMenu
                      open={promoOpen}
                      onOpenChange={(openState) => {
                        setPromoOpen(openState);
                        if (!openState) setPromoSearch("");
                      }}
                    >
                      <DropdownMenu.Trigger asChild>
                        <button
                          type="button"
                          id="promo_id"
                          disabled={promotionsLoading}
                          className={clx(
                            "flex h-8 w-full items-center justify-between gap-x-2 rounded-md border border-ui-border-base bg-ui-bg-field px-2 py-1.5 shadow-buttons-neutral transition-fg",
                            "hover:bg-ui-bg-field-hover",
                            "focus-visible:border-ui-border-interactive focus-visible:shadow-borders-interactive-with-focus focus-visible:outline-none",
                            "disabled:cursor-not-allowed disabled:opacity-50 disabled:shadow-none"
                          )}
                        >
                          <span className="text-ui-fg-base text-compact-small truncate">
                            {selectedPromoId
                              ? (() => {
                                  const p = promotions.find(
                                    (x: PromotionOption) =>
                                      x.id === selectedPromoId
                                  );
                                  return p
                                    ? `${p.code} (${p.status})`
                                    : selectedPromoId;
                                })()
                              : "Select a promotion"}
                          </span>
                          <ChevronDown className="text-ui-fg-muted size-4 shrink-0" />
                        </button>
                      </DropdownMenu.Trigger>
                      <DropdownMenu.Content
                        align="start"
                        className="max-h-[280px] w-[var(--radix-dropdown-menu-trigger-width)] overflow-hidden p-0"
                        onCloseAutoFocus={(e) => e.preventDefault()}
                      >
                        <div className="border-b p-1">
                          <div className="grid grid-cols-[1fr_20px] gap-x-2 rounded-md px-2 py-1 items-center">
                            <input
                              value={promoSearch}
                              onChange={(e) => setPromoSearch(e.target.value)}
                              onKeyDown={(e) => e.stopPropagation()}
                              className="txt-compact-small placeholder:text-ui-fg-muted bg-transparent outline-none"
                              placeholder="Search"
                            />
                            <div className="flex h-5 w-5 items-center justify-center">
                              <button
                                type="button"
                                disabled={!promoSearch}
                                onClick={() => setPromoSearch("")}
                                className={clx(
                                  "transition-fg text-ui-fg-muted focus-visible:bg-ui-bg-base-pressed rounded-md outline-none",
                                  { invisible: !promoSearch }
                                )}
                                aria-label="Clear search"
                              >
                                <XMarkMini />
                              </button>
                            </div>
                          </div>
                        </div>
                        <div className="max-h-[220px] min-h-0 overflow-auto p-1 outline-none">
                          <div
                            role="option"
                            aria-selected={!selectedPromoId}
                            tabIndex={0}
                            onClick={() => {
                              form.setValue("promo_id", null, {
                                shouldDirty: true,
                              });
                              setPromoOpen(false);
                            }}
                            onKeyDown={(e) => {
                              if (e.key === "Enter" || e.key === " ") {
                                e.preventDefault();
                                form.setValue("promo_id", null, {
                                  shouldDirty: true,
                                });
                                setPromoOpen(false);
                              }
                            }}
                            className="hover:bg-ui-bg-base-hover focus-visible:bg-ui-bg-base-pressed text-ui-fg-base txt-compact-small flex cursor-pointer items-center rounded-md px-2 py-1.5 outline-none transition-colors"
                          >
                            None
                          </div>
                          {promotionsLoading ? (
                            <div className="txt-compact-small text-ui-fg-muted flex items-center justify-center py-3">
                              Loading promotions...
                            </div>
                          ) : filteredPromotions.length === 0 ? (
                            <div className="txt-compact-small flex items-center justify-center p-3">
                              {t("general.noResultsTitle", "No results")}
                            </div>
                          ) : (
                            filteredPromotions.map(
                              (promo: PromotionOption, index: number) => {
                                const isLast =
                                  index === filteredPromotions.length - 1;
                                const label = `${promo.code ?? ""} (${
                                  promo.status ?? ""
                                })`;
                                return (
                                  <div
                                    key={promo.id}
                                    ref={
                                      isLast && hasNextPage && !promoSearch
                                        ? lastItemRef
                                        : undefined
                                    }
                                    role="option"
                                    aria-selected={
                                      selectedPromoId === promo.id
                                    }
                                    tabIndex={0}
                                    onClick={() => {
                                      form.setValue("promo_id", promo.id, {
                                        shouldDirty: true,
                                      });
                                      setPromoOpen(false);
                                    }}
                                    onKeyDown={(e) => {
                                      if (e.key === "Enter" || e.key === " ") {
                                        e.preventDefault();
                                        form.setValue("promo_id", promo.id, {
                                          shouldDirty: true,
                                        });
                                        setPromoOpen(false);
                                      }
                                    }}
                                    className="hover:bg-ui-bg-base-hover focus-visible:bg-ui-bg-base-pressed text-ui-fg-base txt-compact-small flex cursor-pointer items-center rounded-md px-2 py-1.5 outline-none transition-colors"
                                  >
                                    {label}
                                  </div>
                                );
                              }
                            )
                          )}
                          {loadingMore && (
                            <div className="txt-compact-small text-ui-fg-muted flex items-center justify-center py-2">
                              Loading more...
                            </div>
                          )}
                        </div>
                      </DropdownMenu.Content>
                    </DropdownMenu>
                    {selectedPromoId && (
                      <Text className="text-xs text-ui-fg-muted mt-1">
                        Selected promotion will be automatically applied to
                        customers in this tier
                      </Text>
                    )}
                  </div>
                </div>
              </div>
            </FocusModal.Body>

            <FocusModal.Footer>
              <div className="flex items-center justify-end gap-x-2">
                <Button
                  variant="secondary"
                  size="small"
                  onClick={handleClose}
                  disabled={isLoading}
                >
                  {t("actions.cancel", "Cancel")}
                </Button>
                <Button
                  size="small"
                  type="button"
                  isLoading={isLoading}
                  onClick={handleSubmit}
                >
                  {isEdit ? "Update Tier" : "Create Tier"}
                </Button>
              </div>
            </FocusModal.Footer>
          </FocusModal.Content>
        </FocusModal>
      </form>
    </FormProvider>
  );
};

export default TierFormModal;
