import { describe, expect, it } from "vitest";
import { render, screen } from "@testing-library/react";
import { BrowserRouter } from "react-router-dom";
import { Landing } from "@/views/Landing";

describe("Landing", () => {
  it("renders the hero headline and a sign-in CTA", () => {
    render(
      <BrowserRouter>
        <Landing />
      </BrowserRouter>,
    );

    expect(screen.getByText(/you can.t find it/i)).toBeInTheDocument();
    expect(screen.getAllByText(/sign in/i).length).toBeGreaterThan(0);
  });

  it("lists the core features", () => {
    render(
      <BrowserRouter>
        <Landing />
      </BrowserRouter>,
    );

    expect(screen.getByText("Custom tags")).toBeInTheDocument();
    expect(screen.getByText("Smart filters")).toBeInTheDocument();
    expect(screen.getByText("Auto-tagging")).toBeInTheDocument();
  });
});
