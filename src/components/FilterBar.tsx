import { useState } from "react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet";
import { Search, Filter, X, SlidersHorizontal } from "lucide-react";
import { Badge } from "@/components/ui/badge";

export interface Filters {
  search: string;
  category: string;
  priceMin: string;
  priceMax: string;
  discountMin: string;
  sortBy: string;
}

interface FilterBarProps {
  filters: Filters;
  onFiltersChange: (filters: Filters) => void;
  categories: string[];
  totalResults: number;
}

export const FilterBar = ({ filters, onFiltersChange, categories, totalResults }: FilterBarProps) => {
  const [isOpen, setIsOpen] = useState(false);

  const updateFilter = (key: keyof Filters, value: string) => {
    onFiltersChange({ ...filters, [key]: value });
  };

  const resetFilters = () => {
    onFiltersChange({
      search: "",
      category: "all",
      priceMin: "",
      priceMax: "",
      discountMin: "",
      sortBy: "newest",
    });
  };

  const activeFilterCount = [
    filters.category !== "all",
    filters.priceMin !== "",
    filters.priceMax !== "",
    filters.discountMin !== "",
  ].filter(Boolean).length;

  return (
    <div className="space-y-4">
      {/* Search and Sort Row */}
      <div className="flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            placeholder="Search deals..."
            value={filters.search}
            onChange={(e) => updateFilter("search", e.target.value)}
            className="pl-10"
          />
        </div>

        <div className="flex gap-2">
          <Select value={filters.sortBy} onValueChange={(value) => updateFilter("sortBy", value)}>
            <SelectTrigger className="w-[180px]">
              <SlidersHorizontal className="mr-2 h-4 w-4" />
              <SelectValue placeholder="Sort by" />
            </SelectTrigger>
            <SelectContent className="bg-popover z-50">
              <SelectItem value="newest">Newest First</SelectItem>
              <SelectItem value="price-low">Price: Low to High</SelectItem>
              <SelectItem value="price-high">Price: High to Low</SelectItem>
              <SelectItem value="discount">Highest Discount</SelectItem>
              <SelectItem value="rating">Best Rating</SelectItem>
            </SelectContent>
          </Select>

          <Sheet open={isOpen} onOpenChange={setIsOpen}>
            <SheetTrigger asChild>
              <Button variant="outline" className="relative">
                <Filter className="mr-2 h-4 w-4" />
                Filters
                {activeFilterCount > 0 && (
                  <Badge className="ml-2 h-5 w-5 rounded-full p-0 flex items-center justify-center">
                    {activeFilterCount}
                  </Badge>
                )}
              </Button>
            </SheetTrigger>
            <SheetContent className="overflow-y-auto">
              <SheetHeader>
                <SheetTitle>Filter Deals</SheetTitle>
                <SheetDescription>
                  Refine your search with these filters
                </SheetDescription>
              </SheetHeader>

              <div className="space-y-6 py-6">
                {/* Category Filter */}
                <div className="space-y-2">
                  <Label>Category</Label>
                  <Select value={filters.category} onValueChange={(value) => updateFilter("category", value)}>
                    <SelectTrigger>
                      <SelectValue placeholder="All Categories" />
                    </SelectTrigger>
                    <SelectContent className="bg-popover z-50">
                      <SelectItem value="all">All Categories</SelectItem>
                      {categories.map((cat) => (
                        <SelectItem key={cat} value={cat}>
                          {cat}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                {/* Price Range */}
                <div className="space-y-2">
                  <Label>Price Range</Label>
                  <div className="grid grid-cols-2 gap-2">
                    <div>
                      <Input
                        type="number"
                        placeholder="Min $"
                        value={filters.priceMin}
                        onChange={(e) => updateFilter("priceMin", e.target.value)}
                      />
                    </div>
                    <div>
                      <Input
                        type="number"
                        placeholder="Max $"
                        value={filters.priceMax}
                        onChange={(e) => updateFilter("priceMax", e.target.value)}
                      />
                    </div>
                  </div>
                </div>

                {/* Discount Filter */}
                <div className="space-y-2">
                  <Label>Minimum Discount</Label>
                  <Select value={filters.discountMin} onValueChange={(value) => updateFilter("discountMin", value)}>
                    <SelectTrigger>
                      <SelectValue placeholder="Any discount" />
                    </SelectTrigger>
                    <SelectContent className="bg-popover z-50">
                      <SelectItem value="">Any discount</SelectItem>
                      <SelectItem value="10">10% or more</SelectItem>
                      <SelectItem value="25">25% or more</SelectItem>
                      <SelectItem value="50">50% or more</SelectItem>
                      <SelectItem value="75">75% or more</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                {/* Action Buttons */}
                <div className="flex gap-2 pt-4">
                  <Button onClick={() => setIsOpen(false)} className="flex-1">
                    Apply Filters
                  </Button>
                  <Button onClick={resetFilters} variant="outline">
                    <X className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            </SheetContent>
          </Sheet>
        </div>
      </div>

      {/* Active Filters Display */}
      {activeFilterCount > 0 && (
        <div className="flex flex-wrap gap-2 items-center">
          <span className="text-sm text-muted-foreground">Active filters:</span>
          {filters.category !== "all" && (
            <Badge variant="secondary" className="gap-1">
              Category: {filters.category}
              <X 
                className="h-3 w-3 cursor-pointer" 
                onClick={() => updateFilter("category", "all")}
              />
            </Badge>
          )}
          {filters.priceMin && (
            <Badge variant="secondary" className="gap-1">
              Min: ${filters.priceMin}
              <X 
                className="h-3 w-3 cursor-pointer" 
                onClick={() => updateFilter("priceMin", "")}
              />
            </Badge>
          )}
          {filters.priceMax && (
            <Badge variant="secondary" className="gap-1">
              Max: ${filters.priceMax}
              <X 
                className="h-3 w-3 cursor-pointer" 
                onClick={() => updateFilter("priceMax", "")}
              />
            </Badge>
          )}
          {filters.discountMin && (
            <Badge variant="secondary" className="gap-1">
              {filters.discountMin}%+ off
              <X 
                className="h-3 w-3 cursor-pointer" 
                onClick={() => updateFilter("discountMin", "")}
              />
            </Badge>
          )}
          <Button 
            variant="ghost" 
            size="sm" 
            onClick={resetFilters}
            className="h-6 text-xs"
          >
            Clear all
          </Button>
        </div>
      )}

      {/* Results Count */}
      <div className="text-sm text-muted-foreground">
        {totalResults === 0 ? (
          <span>No deals found matching your criteria</span>
        ) : (
          <span>
            Showing <span className="font-semibold text-foreground">{totalResults}</span> deal{totalResults !== 1 ? "s" : ""}
          </span>
        )}
      </div>
    </div>
  );
};
