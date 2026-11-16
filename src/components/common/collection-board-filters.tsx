import { FilterSelect } from "@/src/components/admin-ui/filter-bar";
import { useGetPlansQuery } from "@/src/store/api/admin-api";
import { COLLECTION_FREQUENCIES, COLLECTION_FREQUENCY_LABELS } from "@/src/types/collection";

export type CollectionBoardFilterValues = {
  planId?: string;
  collectionFrequency?: string;
  bonusStatus?: string;
};

const frequencyOptions = [
  { value: "ALL", label: "All" },
  ...COLLECTION_FREQUENCIES.map((value) => ({ value, label: COLLECTION_FREQUENCY_LABELS[value] })),
];
const bonusOptions = [
  { value: "ALL", label: "All" },
  { value: "PENDING", label: "Pending" },
  { value: "PENDING_RATE", label: "Awaiting gold rate" },
  { value: "CREDITED", label: "Credited" },
  { value: "INELIGIBLE", label: "Not earned" },
];

export function CollectionBoardFilters({
  filters,
  onChange,
  showBonus = false,
}: {
  filters: CollectionBoardFilterValues;
  onChange: (filters: CollectionBoardFilterValues) => void;
  showBonus?: boolean;
}) {
  const { data } = useGetPlansQuery({ limit: 100 });
  const planOptions = [
    { value: "ALL", label: "All" },
    ...(data?.items ?? []).map((plan: { id: string; name: string }) => ({
      value: plan.id,
      label: plan.name,
    })),
  ];

  return (
    <div className="flex min-w-0 flex-wrap gap-2">
      <FilterSelect
        label="Plan"
        value={filters.planId ?? "ALL"}
        options={planOptions}
        onChange={(planId) => onChange({ ...filters, planId: planId === "ALL" ? undefined : planId })}
        className="max-w-full"
      />
      <FilterSelect
        label="Frequency"
        value={filters.collectionFrequency ?? "ALL"}
        options={frequencyOptions}
        onChange={(collectionFrequency) => onChange({
          ...filters,
          collectionFrequency: collectionFrequency === "ALL" ? undefined : collectionFrequency,
        })}
      />
      {showBonus && (
        <FilterSelect
          label="Bonus"
          value={filters.bonusStatus ?? "ALL"}
          options={bonusOptions}
          onChange={(bonusStatus) => onChange({ ...filters, bonusStatus: bonusStatus === "ALL" ? undefined : bonusStatus })}
        />
      )}
    </div>
  );
}
