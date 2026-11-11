import { describe, expect, it } from "vitest";
import { renderToStaticMarkup } from "react-dom/server";
import { ForkKnifeIcon, Logo } from "./Logo";
import { STATUS_LABELS, StatusCutlery } from "./StatusCutlery";

describe("brand drawings", () => {
  it("uses round stroke caps and no fills", () => {
    for (const html of [renderToStaticMarkup(<ForkKnifeIcon />), renderToStaticMarkup(<StatusCutlery status="complete" />)]) {
      expect(html).toContain('stroke-linecap="round"');
      expect(html).toContain('fill="none"');
      expect(html).toContain('stroke="currentColor"');
    }
  });

  it("renders the wordmark next to the icon", () => {
    const html = renderToStaticMarkup(<Logo />);
    expect(html).toContain("Kitchen Corp");
    expect(html).toContain("<svg");
  });

  it("status icon distinguishes the two states and always has a tooltip", () => {
    const a = renderToStaticMarkup(<StatusCutlery status="in_progress" />);
    const b = renderToStaticMarkup(<StatusCutlery status="complete" />);
    expect(a).not.toBe(b);
    expect(a).toContain('rotate(-45 12 12)'); // crossed
    expect(b).not.toContain('rotate(-45 12 12)'); // side by side at one angle
    expect(a).toContain('role="tooltip"');
    expect(a).toContain(STATUS_LABELS.in_progress.tooltip);
    expect(b).toContain(STATUS_LABELS.complete.tooltip);
    expect(a).toContain(`aria-label="${STATUS_LABELS.in_progress.tooltip}"`);
  });
});
