import { HttpResponse, http } from "msw";
import { describe, expect, it, vi } from "vitest";
import { server } from "../../tests/setup/msw-server";
import {
  createCategoryAction,
  deleteCategoryAction,
  listCategoriesAction,
  updateCategoryAction,
} from "./category-actions";

const API_URL = "http://localhost:3333";

vi.mock("@/lib/session", () => ({
  getAccessToken: () => Promise.resolve("token-123"),
}));

vi.mock("@/i18n/navigation", () => ({ redirect: vi.fn() }));
vi.mock("next-intl/server", () => ({ getLocale: () => Promise.resolve("en") }));

describe("createCategoryAction", () => {
  it("resolves the created category on success", async () => {
    const category = {
      id: "cat-1",
      kind: "expense",
      label: "Travel",
      icon: "plane",
      isFallback: false,
      isSystem: false,
    };
    server.use(
      http.post(`${API_URL}/categories`, () =>
        HttpResponse.json(category, { status: 201 }),
      ),
    );

    await expect(
      createCategoryAction("expense", "Travel", "plane"),
    ).resolves.toEqual({ ok: true, category });
  });

  it("maps a 409 to duplicate", async () => {
    server.use(
      http.post(`${API_URL}/categories`, () =>
        HttpResponse.json(
          { message: "category already exists" },
          { status: 409 },
        ),
      ),
    );

    await expect(
      createCategoryAction("expense", "Travel", "plane"),
    ).resolves.toEqual({
      ok: false,
      code: "duplicate",
      message: "category already exists",
    });
  });
});

describe("updateCategoryAction", () => {
  it("maps a 409 to duplicate", async () => {
    server.use(
      http.patch(`${API_URL}/categories/cat-1`, () =>
        HttpResponse.json(
          { message: "category already exists" },
          { status: 409 },
        ),
      ),
    );

    await expect(
      updateCategoryAction("cat-1", "Taken", "plane"),
    ).resolves.toEqual({
      ok: false,
      code: "duplicate",
      message: "category already exists",
    });
  });
});

describe("deleteCategoryAction", () => {
  it("resolves ok on success", async () => {
    server.use(
      http.delete(
        `${API_URL}/categories/cat-1`,
        () => new HttpResponse(null, { status: 204 }),
      ),
    );

    await expect(deleteCategoryAction("cat-1")).resolves.toEqual({ ok: true });
  });

  it("resolves ok:false with the backend message on failure", async () => {
    server.use(
      http.delete(`${API_URL}/categories/cat-1`, () =>
        HttpResponse.json(
          { message: "can't delete the default category" },
          { status: 409 },
        ),
      ),
    );

    await expect(deleteCategoryAction("cat-1")).resolves.toEqual({
      ok: false,
      message: "can't delete the default category",
    });
  });
});

describe("listCategoriesAction", () => {
  it("filters out isSystem categories", async () => {
    server.use(
      http.get(`${API_URL}/categories`, () =>
        HttpResponse.json([
          {
            id: "cat-1",
            kind: "expense",
            label: "Travel",
            icon: "plane",
            isFallback: false,
            isSystem: false,
          },
          {
            id: "cat-2",
            kind: "expense",
            label: "Credit Card Bill",
            icon: "banknote",
            isFallback: false,
            isSystem: true,
          },
        ]),
      ),
    );

    const categories = await listCategoriesAction("expense");

    expect(categories.map((c) => c.id)).toEqual(["cat-1"]);
  });

  it("resolves to an empty array (not a throw) on a non-2xx response", async () => {
    server.use(
      http.get(`${API_URL}/categories`, () =>
        HttpResponse.json(
          { message: "internal server error" },
          { status: 500 },
        ),
      ),
    );

    await expect(listCategoriesAction("expense")).resolves.toEqual([]);
  });
});
