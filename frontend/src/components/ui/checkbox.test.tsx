import { screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";
import { render } from "../../../tests/setup/test-utils";
import { Checkbox } from "./checkbox";

describe("Checkbox", () => {
  it("toggles on Space (native checkbox behavior)", async () => {
    const user = userEvent.setup();
    const onCheckedChange = vi.fn();
    render(<Checkbox checked={false} onCheckedChange={onCheckedChange} />);

    const checkbox = screen.getByRole("checkbox");
    checkbox.focus();
    await user.keyboard(" ");

    expect(onCheckedChange).toHaveBeenCalledWith(true, expect.anything());
  });

  it("toggles on Enter, overriding Base UI's native-checkbox default", async () => {
    const user = userEvent.setup();
    const onCheckedChange = vi.fn();
    render(<Checkbox checked={false} onCheckedChange={onCheckedChange} />);

    const checkbox = screen.getByRole("checkbox");
    checkbox.focus();
    await user.keyboard("{Enter}");

    expect(onCheckedChange).toHaveBeenCalledWith(true, expect.anything());
  });
});
