import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import { render, screen, waitFor, cleanup } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import FilterOldJobsDialog from "../FilterOldJobsDialog";

describe("FilterOldJobsDialog", () => {
  const mockOnClose = vi.fn();
  const mockOnSubmit = vi.fn();

  beforeEach(() => {
    cleanup();
    mockOnClose.mockClear();
    mockOnSubmit.mockClear();
    global.fetch = vi.fn();
  });

  afterEach(() => {
    cleanup();
  });

  describe("Rendering", () => {
    it("should not render when isOpen is false", () => {
      const { container } = render(
        <FilterOldJobsDialog
          isOpen={false}
          onClose={mockOnClose}
          onSubmit={mockOnSubmit}
        />
      );
      expect(container.firstChild).toBeNull();
    });

    it("should render dialog when isOpen is true", () => {
      render(
        <FilterOldJobsDialog
          isOpen={true}
          onClose={mockOnClose}
          onSubmit={mockOnSubmit}
        />
      );
      expect(screen.getByText(/Filtrer les offres/)).toBeInTheDocument();
      expect(screen.getByLabelText(/Nombre de jours/i)).toBeInTheDocument();
    });

    it("should have input field with correct constraints", () => {
      render(
        <FilterOldJobsDialog
          isOpen={true}
          onClose={mockOnClose}
          onSubmit={mockOnSubmit}
        />
      );
      const input = screen.getByLabelText(/Nombre de jours/i) as HTMLInputElement;
      expect(input.type).toBe("number");
      expect(input.min).toBe("1");
      expect(input.max).toBe("365");
    });
  });

  describe("Input Validation", () => {
    it("should show error for input < 1", async () => {
      const user = userEvent.setup();
      render(
        <FilterOldJobsDialog
          isOpen={true}
          onClose={mockOnClose}
          onSubmit={mockOnSubmit}
        />
      );

      const input = screen.getByLabelText(/Nombre de jours/i) as HTMLInputElement;
      await user.clear(input);
      await user.type(input, "0");

      const nextButton = screen.getByRole("button", { name: /Suivant/i });
      await user.click(nextButton);

      await waitFor(() => {
        expect(screen.getByText(/Minimum 1 jour/)).toBeInTheDocument();
      });
    });

    it("should show error for input > 365", async () => {
      const user = userEvent.setup();
      render(
        <FilterOldJobsDialog
          isOpen={true}
          onClose={mockOnClose}
          onSubmit={mockOnSubmit}
        />
      );

      const input = screen.getByLabelText(/Nombre de jours/i) as HTMLInputElement;
      await user.clear(input);
      await user.type(input, "366");

      const nextButton = screen.getByRole("button", { name: /Suivant/i });
      await user.click(nextButton);

      await waitFor(() => {
        expect(screen.getByText(/Maximum 365 jours/)).toBeInTheDocument();
      });
    });

    it("should clear error when input changes", async () => {
      const user = userEvent.setup();
      render(
        <FilterOldJobsDialog
          isOpen={true}
          onClose={mockOnClose}
          onSubmit={mockOnSubmit}
        />
      );

      const input = screen.getByLabelText(/Nombre de jours/i) as HTMLInputElement;
      await user.type(input, "0");

      const nextButton = screen.getByRole("button", { name: /Suivant/i });
      await user.click(nextButton);

      await waitFor(() => {
        expect(screen.getByText(/Minimum 1 jour/)).toBeInTheDocument();
      });

      await user.clear(input);
      await user.type(input, "30");

      // Error should be cleared immediately
      expect(screen.queryByText(/Minimum 1 jour/)).not.toBeInTheDocument();
    });
  });

  describe("API Integration", () => {
    it("should call API with correct filterOlderThan parameter", async () => {
      const user = userEvent.setup();
      global.fetch = vi.fn(() =>
        Promise.resolve({
          ok: true,
          json: async () => ({ total: 5 }),
        } as Response)
      );

      render(
        <FilterOldJobsDialog
          isOpen={true}
          onClose={mockOnClose}
          onSubmit={mockOnSubmit}
        />
      );

      const input = screen.getByLabelText(/Nombre de jours/i) as HTMLInputElement;
      await user.type(input, "14");

      const nextButton = screen.getByRole("button", { name: /Suivant/i });
      await user.click(nextButton);

      await waitFor(() => {
        expect(global.fetch).toHaveBeenCalledWith(
          "/api/jobs?status=INBOX&filterOlderThan=14"
        );
      });
    });

    it("should handle API error gracefully", async () => {
      const user = userEvent.setup();
      global.fetch = vi.fn(() =>
        Promise.resolve({
          ok: false,
          json: async () => ({}),
        } as Response)
      );

      render(
        <FilterOldJobsDialog
          isOpen={true}
          onClose={mockOnClose}
          onSubmit={mockOnSubmit}
        />
      );

      const input = screen.getByLabelText(/Nombre de jours/i) as HTMLInputElement;
      await user.type(input, "7");

      const nextButton = screen.getByRole("button", { name: /Suivant/i });
      await user.click(nextButton);

      await waitFor(() => {
        expect(screen.getByText(/Erreur lors du comptage/)).toBeInTheDocument();
      });
    });
  });

  describe("User Interactions", () => {
    it("should call onClose when Annuler button is clicked", async () => {
      const user = userEvent.setup();
      render(
        <FilterOldJobsDialog
          isOpen={true}
          onClose={mockOnClose}
          onSubmit={mockOnSubmit}
        />
      );

      const cancelButton = screen.getByRole("button", { name: /Annuler/i });
      await user.click(cancelButton);

      expect(mockOnClose).toHaveBeenCalled();
    });

    it("should disable input while loading", async () => {
      const user = userEvent.setup();
      global.fetch = vi.fn(
        () =>
          new Promise((resolve) =>
            setTimeout(
              () =>
                resolve({
                  ok: true,
                  json: async () => ({ total: 3 }),
                } as Response),
              100
            )
          )
      );

      render(
        <FilterOldJobsDialog
          isOpen={true}
          onClose={mockOnClose}
          onSubmit={mockOnSubmit}
        />
      );

      const input = screen.getByLabelText(/Nombre de jours/i) as HTMLInputElement;
      await user.type(input, "14");

      const nextButton = screen.getByRole("button", { name: /Suivant/i });
      await user.click(nextButton);

      // Input should be disabled during loading
      expect(input).toBeDisabled();
    });
  });
});
