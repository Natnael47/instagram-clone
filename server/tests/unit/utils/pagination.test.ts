import { describe, expect, it } from "bun:test";
import {
  createPaginationMetadata,
  formatPaginatedResult,
  generatePaginationLinks,
  parsePaginationParams,
} from "../../../src/utils/pagination";

describe("Pagination Utilities", () => {
  describe("parsePaginationParams()", () => {
    it("should return default values when no params provided", () => {
      const result = parsePaginationParams();

      expect(result.page).toBe(1);
      expect(result.limit).toBe(10);
      expect(result.skip).toBe(0);
    });

    it("should parse string page and limit", () => {
      const result = parsePaginationParams("2", "20");

      expect(result.page).toBe(2);
      expect(result.limit).toBe(20);
      expect(result.skip).toBe(20);
    });

    it("should parse number page and limit", () => {
      const result = parsePaginationParams(3, 15);

      expect(result.page).toBe(3);
      expect(result.limit).toBe(15);
      expect(result.skip).toBe(30);
    });

    it("should enforce minimum page of 1", () => {
      const result = parsePaginationParams(0, 10);
      expect(result.page).toBe(1);
    });

    it("should enforce minimum page for negative numbers", () => {
      const result = parsePaginationParams(-5, 10);
      expect(result.page).toBe(1);
    });

    it("should use default limit of 10 when 0 is passed", () => {
      const result = parsePaginationParams(1, 0);
      // Your implementation: 0 is falsy, so parseInt("0") returns NaN,
      // then || 10 kicks in and returns default 10
      expect(result.limit).toBe(10);
    });

    it("should enforce maximum limit of 100", () => {
      const result = parsePaginationParams(1, 200);
      expect(result.limit).toBe(100);
    });

    it("should handle NaN values gracefully", () => {
      const result = parsePaginationParams("abc", "xyz");

      expect(result.page).toBe(1);
      expect(result.limit).toBe(10);
    });

    it("should calculate correct skip for page 1", () => {
      const result = parsePaginationParams(1, 20);
      expect(result.skip).toBe(0);
    });

    it("should calculate correct skip for page 5", () => {
      const result = parsePaginationParams(5, 20);
      expect(result.skip).toBe(80);
    });
  });

  describe("createPaginationMetadata()", () => {
    it("should create correct metadata for multiple pages", () => {
      const metadata = createPaginationMetadata(1, 10, 55);

      expect(metadata.page).toBe(1);
      expect(metadata.limit).toBe(10);
      expect(metadata.total).toBe(55);
      expect(metadata.pages).toBe(6);
      expect(metadata.hasNext).toBe(true);
      expect(metadata.hasPrev).toBe(false);
    });

    it("should create metadata for middle page", () => {
      const metadata = createPaginationMetadata(3, 10, 55);

      expect(metadata.page).toBe(3);
      expect(metadata.hasNext).toBe(true);
      expect(metadata.hasPrev).toBe(true);
    });

    it("should create metadata for last page", () => {
      const metadata = createPaginationMetadata(6, 10, 55);

      expect(metadata.hasNext).toBe(false);
      expect(metadata.hasPrev).toBe(true);
    });

    it("should handle single page", () => {
      const metadata = createPaginationMetadata(1, 10, 5);

      expect(metadata.pages).toBe(1);
      expect(metadata.hasNext).toBe(false);
      expect(metadata.hasPrev).toBe(false);
    });

    it("should handle exactly divisible", () => {
      const metadata = createPaginationMetadata(1, 10, 50);

      expect(metadata.pages).toBe(5);
    });

    it("should handle zero total", () => {
      const metadata = createPaginationMetadata(1, 10, 0);

      expect(metadata.pages).toBe(0);
      expect(metadata.hasNext).toBe(false);
      expect(metadata.hasPrev).toBe(false);
    });
  });

  describe("formatPaginatedResult()", () => {
    it("should format data with pagination", () => {
      const data = [{ id: 1 }, { id: 2 }, { id: 3 }];
      const result = formatPaginatedResult(data, 1, 10, 25);

      expect(result.data).toEqual(data);
      expect(result.pagination).toBeDefined();
      expect(result.pagination.page).toBe(1);
      expect(result.pagination.limit).toBe(10);
      expect(result.pagination.total).toBe(25);
    });

    it("should handle empty data", () => {
      const result = formatPaginatedResult([], 1, 10, 0);

      expect(result.data).toEqual([]);
      expect(result.pagination.total).toBe(0);
    });

    it("should maintain data types with generics", () => {
      interface TestItem {
        id: number;
        name: string;
      }

      const data: TestItem[] = [
        { id: 1, name: "Item 1" },
        { id: 2, name: "Item 2" },
      ];

      const result = formatPaginatedResult<TestItem>(data, 1, 10, 2);

      expect(result.data.length).toBe(2);
      const firstItem = result.data[0];
      expect(firstItem).toBeDefined();
      if (firstItem) {
        expect(firstItem.name).toBe("Item 1");
      }
      expect(result.pagination.total).toBe(2);
    });
  });

  describe("generatePaginationLinks()", () => {
    it("should generate links for first page", () => {
      const links = generatePaginationLinks(
        "http://localhost:5000/api/users",
        1,
        10,
        55,
      );

      expect(links.first).toContain("page=1");
      expect(links.last).toContain("page=6");
      expect(links.prev).toBeNull();
      expect(links.next).toContain("page=2");
    });

    it("should generate links for middle page", () => {
      const links = generatePaginationLinks(
        "http://localhost:5000/api/users",
        3,
        10,
        55,
      );

      expect(links.first).toContain("page=1");
      expect(links.last).toContain("page=6");
      expect(links.prev).toContain("page=2");
      expect(links.next).toContain("page=4");
    });

    it("should generate links for last page", () => {
      const links = generatePaginationLinks(
        "http://localhost:5000/api/users",
        6,
        10,
        55,
      );

      expect(links.prev).toContain("page=5");
      expect(links.next).toBeNull();
    });

    it("should include limit parameter in links", () => {
      const links = generatePaginationLinks(
        "http://localhost:5000/api/users",
        1,
        20,
        100,
      );

      expect(links.next).toContain("limit=20");
      expect(links.first).toContain("limit=20");
      expect(links.last).toContain("limit=20");
    });

    it("should handle single page", () => {
      const links = generatePaginationLinks(
        "http://localhost:5000/api/users",
        1,
        10,
        5,
      );

      expect(links.first).toContain("page=1");
      expect(links.last).toContain("page=1");
      expect(links.prev).toBeNull();
      expect(links.next).toBeNull();
    });
  });
});
