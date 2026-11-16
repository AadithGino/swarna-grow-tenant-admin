// @vitest-environment happy-dom
import { cleanup, fireEvent, render, screen, within } from "@testing-library/react";
import { afterEach, expect, it, vi } from "vitest";
import { PlanBuilderWizard } from "./plan-builder-wizard";

vi.mock("next/navigation", () => ({ useRouter: () => ({ push: vi.fn() }) }));
vi.mock("@/src/components/common/permission-gate", () => ({
  PermissionGate: ({ children }: { children: React.ReactNode }) => children,
}));
vi.mock("@/src/store/hooks", () => ({
  useAppSelector: () => ({ flexibleScheme: true }),
}));
vi.mock("@/src/store/api/admin-api", async () => {
  const { useState } = await import("react");
  const { buildPlanSchedulePreview } = await import("@/src/mocks/plan-preview-mock");
  return {
    useGetPlanQuery: () => ({}),
    useGetBranchesQuery: () => ({}),
    useCreatePlanMutation: () => [vi.fn()],
    usePatchPlanMutation: () => [vi.fn()],
    usePreviewPlanScheduleMutation: () => {
      const [args, setArgs] = useState<Record<string, unknown>>();
      return [
        (body: Record<string, unknown>) => ({
          unwrap: async () => {
            setArgs(body);
            return buildPlanSchedulePreview(body);
          },
        }),
        { originalArgs: args, data: args && buildPlanSchedulePreview(args) },
      ];
    },
  };
});

afterEach(cleanup);

it("switches from instalments to one-time funding and regenerates the wizard preview", async () => {
  const { container } = render(<PlanBuilderWizard />);
  const step = (id: string) => fireEvent.click(container.querySelector(`[data-tour="plan-step:${id}"]`)!);
  const sidebar = within(container.querySelector('[data-tour="plan-wizard-preview"]')! as HTMLElement);
  step("amount");
  expect(await sidebar.findByText("Installment")).toBeTruthy();
  step("type");
  expect(screen.getByText("Payment pattern")).toBeTruthy();
  fireEvent.click(screen.getByRole("button", { name: /One-time gold/ }));
  expect(screen.queryByText("Payment pattern")).toBeNull();
  step("amount");
  expect(sidebar.queryByText("Installment")).toBeNull();
  expect(await sidebar.findByText("Bonus credit dates")).toBeTruthy();
  step("schedule");
  expect(screen.getByText(/The verified payment date starts the tenure/)).toBeTruthy();
  step("review");
  expect(within(container.querySelector('[data-tour="plan-wizard-form"]')! as HTMLElement).getByText("Bonus credit dates")).toBeTruthy();
});
