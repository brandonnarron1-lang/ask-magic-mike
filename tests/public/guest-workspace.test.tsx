import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
vi.mock("../../app/components/black-diamond/BuyerIntentSection", () => ({BuyerIntentSection:({initialInterest}: {initialInterest:unknown}) => <div data-testid="canonical-intake">{JSON.stringify(initialInterest)}</div>}));
import { GuestWorkspace } from "../../app/components/consumer/GuestWorkspace";

function save(value="123 Synthetic Lane") {
  fireEvent.change(screen.getByLabelText("Address or listing link"), {target:{value}});
  fireEvent.click(screen.getByRole("button", {name:"Save for comparison"}));
}
describe("guest saved-interest comparison", () => {
  it("starts empty and saves only after an explicit action, without contact or storage", () => {
    const fetcher = vi.spyOn(globalThis,"fetch");
    render(<GuestWorkspace />);
    expect(screen.getByRole("status")).toHaveTextContent("No saved interests yet");
    expect(screen.queryByTestId("canonical-intake")).toBeNull();
    save();
    expect(screen.getByRole("heading",{name:"123 Synthetic Lane"})).toBeVisible();
    expect(screen.getByText("Not established")).toBeVisible();
    expect(fetcher).not.toHaveBeenCalled();
    expect(screen.queryByTestId("canonical-intake")).toBeNull();
    fetcher.mockRestore();
  });
  it("compares, refuses duplicates, removes, and transfers one stable explicit reference", () => {
    render(<GuestWorkspace />);save();save("456 Synthetic Lane");save();
    expect(screen.getByRole("alert")).toHaveTextContent("already in this comparison");
    fireEvent.click(screen.getAllByRole("button",{name:"Prepare a help request"})[0]);
    expect(screen.getByTestId("canonical-intake")).toHaveTextContent("123 Synthetic Lane");
    expect(screen.getByRole("heading",{name:"Review before you ask for help."})).toHaveFocus();
    expect(screen.getAllByRole("button",{name:"Prepare a help request"}).every(button=>(button as HTMLButtonElement).disabled)).toBe(true);
    fireEvent.click(screen.getByRole("button",{name:"Remove 123 Synthetic Lane"}));
    expect(screen.getByTestId("canonical-intake")).toHaveTextContent("123 Synthetic Lane");
  });
  it("stores search and declared budget without fabricating a property", () => {
    render(<GuestWorkspace />);
    fireEvent.change(screen.getByRole("combobox"),{target:{value:"search"}});
    fireEvent.change(screen.getByLabelText("Search area"),{target:{value:"Wilson"}});
    fireEvent.change(screen.getByLabelText("Budget range (optional)"),{target:{value:"Under $300,000"}});
    fireEvent.click(screen.getByRole("button",{name:"Save for comparison"}));
    expect(screen.getByText("Under $300,000")).toBeVisible();
    fireEvent.click(screen.getByRole("button",{name:"Prepare a help request"}));
    expect(screen.getByTestId("canonical-intake")).toHaveTextContent('"kind":"search"');
    expect(screen.getByTestId("canonical-intake")).not.toHaveTextContent("properties");
  });
  it("rejects script/credential links and renders untrusted markup as text", () => {
    render(<GuestWorkspace />);save("javascript:alert(1)");
    expect(screen.getByRole("alert")).toBeVisible();
    expect(screen.queryByRole("article")).toBeNull();
    save("<img src=x onerror=alert(1)>");
    expect(screen.getByRole("heading",{name:"<img src=x onerror=alert(1)>"})).toBeVisible();
    expect(document.querySelector("img")).toBeNull();
  });
});
