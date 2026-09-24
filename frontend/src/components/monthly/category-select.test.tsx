import { screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";
import type { Category } from "@/lib/types";
import { render } from "../../../tests/setup/test-utils";
import { CategorySelect } from "./category-select";

const travel: Category = {
  id: "cat-1",
  kind: "expense",
  label: "Travel",
  icon: "plane",
  isFallback: false,
  isSystem: false,
};
const other: Category = {
  id: "cat-2",
  kind: "expense",
  label: "Other",
  icon: "tag",
  isFallback: true,
  isSystem: false,
};
const billCategory: Category = {
  id: "cat-3",
  kind: "expense",
  label: "Credit Card Bill",
  icon: "banknote",
  isFallback: false,
  isSystem: true,
};

const categories = [travel, other, billCategory];

describe("CategorySelect", () => {
  it("opens the listbox and shows every category row", async () => {
    const user = userEvent.setup();
    render(
      <CategorySelect
        value={null}
        onChange={vi.fn()}
        categories={categories}
        onAdd={vi.fn()}
        onEdit={vi.fn()}
        onDelete={vi.fn()}
      />,
    );

    await user.click(screen.getByRole("combobox"));

    expect(await screen.findByText("Travel")).toBeInTheDocument();
    expect(screen.getByText("Other")).toBeInTheDocument();
  });

  it("calls onChange when a row is selected", async () => {
    const onChange = vi.fn();
    const user = userEvent.setup();
    render(
      <CategorySelect
        value={null}
        onChange={onChange}
        categories={categories}
        onAdd={vi.fn()}
        onEdit={vi.fn()}
        onDelete={vi.fn()}
      />,
    );

    await user.click(screen.getByRole("combobox"));
    await user.click(await screen.findByText("Travel"));

    expect(onChange).toHaveBeenCalledWith("cat-1");
  });

  it("omits the delete button for the fallback and system categories, but keeps rename", async () => {
    const user = userEvent.setup();
    render(
      <CategorySelect
        value={null}
        onChange={vi.fn()}
        categories={categories}
        onAdd={vi.fn()}
        onEdit={vi.fn()}
        onDelete={vi.fn()}
      />,
    );

    await user.click(screen.getByRole("combobox"));
    await screen.findByText("Travel");

    expect(
      screen.getAllByRole("button", { name: /rename category/i }),
    ).toHaveLength(3);
    expect(
      screen.getAllByRole("button", { name: /delete category/i }),
    ).toHaveLength(1);
  });

  it("clicking + swaps to the inline add panel with the default icon selected", async () => {
    const user = userEvent.setup();
    render(
      <CategorySelect
        value={null}
        onChange={vi.fn()}
        categories={categories}
        onAdd={vi.fn()}
        onEdit={vi.fn()}
        onDelete={vi.fn()}
      />,
    );

    await user.click(screen.getByRole("button", { name: /add category/i }));

    expect(screen.getByPlaceholderText("Category name")).toBeInTheDocument();
    expect(screen.queryByRole("combobox")).not.toBeInTheDocument();
  });

  it("confirming a new category calls onAdd and selects the created category", async () => {
    const onAdd = vi.fn().mockResolvedValue({
      id: "cat-new",
      kind: "expense",
      label: "Pet Supplies",
      icon: "tag",
      isFallback: false,
      isSystem: false,
    });
    const onChange = vi.fn();
    const user = userEvent.setup();
    render(
      <CategorySelect
        value={null}
        onChange={onChange}
        categories={categories}
        onAdd={onAdd}
        onEdit={vi.fn()}
        onDelete={vi.fn()}
      />,
    );

    await user.click(screen.getByRole("button", { name: /add category/i }));
    await user.type(
      screen.getByPlaceholderText("Category name"),
      "Pet Supplies{Enter}",
    );

    expect(onAdd).toHaveBeenCalledWith("Pet Supplies", "tag");
    expect(onChange).toHaveBeenCalledWith("cat-new");
    expect(
      screen.queryByPlaceholderText("Category name"),
    ).not.toBeInTheDocument();
  });

  it("a duplicate-label error keeps the panel open with the typed label intact", async () => {
    const onAdd = vi.fn().mockResolvedValue(null);
    const user = userEvent.setup();
    render(
      <CategorySelect
        value={null}
        onChange={vi.fn()}
        categories={categories}
        onAdd={onAdd}
        onEdit={vi.fn()}
        onDelete={vi.fn()}
      />,
    );

    await user.click(screen.getByRole("button", { name: /add category/i }));
    const input = screen.getByPlaceholderText("Category name");
    await user.type(input, "Travel");
    await user.type(input, "{Enter}");

    expect(
      await screen.findByText("A category with this name already exists"),
    ).toBeInTheDocument();
    expect(screen.getByPlaceholderText("Category name")).toHaveValue("Travel");
  });

  it("Escape cancels the inline panel without calling onAdd", async () => {
    const onAdd = vi.fn();
    const user = userEvent.setup();
    render(
      <CategorySelect
        value={null}
        onChange={vi.fn()}
        categories={categories}
        onAdd={onAdd}
        onEdit={vi.fn()}
        onDelete={vi.fn()}
      />,
    );

    await user.click(screen.getByRole("button", { name: /add category/i }));
    await user.type(screen.getByPlaceholderText("Category name"), "Draft");
    await user.keyboard("{Escape}");

    expect(
      screen.queryByPlaceholderText("Category name"),
    ).not.toBeInTheDocument();
    expect(onAdd).not.toHaveBeenCalled();
  });

  it("clicking rename pre-fills the panel and confirming calls onEdit", async () => {
    const onEdit = vi.fn().mockResolvedValue(true);
    const user = userEvent.setup();
    render(
      <CategorySelect
        value={null}
        onChange={vi.fn()}
        categories={categories}
        onAdd={vi.fn()}
        onEdit={onEdit}
        onDelete={vi.fn()}
      />,
    );

    await user.click(screen.getByRole("combobox"));
    await screen.findByText("Travel");
    await user.click(
      screen.getAllByRole("button", { name: /rename category/i })[0],
    );

    const input = screen.getByPlaceholderText("Category name");
    expect(input).toHaveValue("Travel");

    await user.clear(input);
    await user.type(input, "Trips{Enter}");

    expect(onEdit).toHaveBeenCalledWith("cat-1", "Trips", "plane");
  });

  it("clicking delete on a normal row calls onDelete", async () => {
    const onDelete = vi.fn().mockResolvedValue(undefined);
    const user = userEvent.setup();
    render(
      <CategorySelect
        value={null}
        onChange={vi.fn()}
        categories={categories}
        onAdd={vi.fn()}
        onEdit={vi.fn()}
        onDelete={onDelete}
      />,
    );

    await user.click(screen.getByRole("combobox"));
    await screen.findByText("Travel");
    await user.click(screen.getByRole("button", { name: /delete category/i }));

    expect(onDelete).toHaveBeenCalledWith("cat-1");
  });
});
