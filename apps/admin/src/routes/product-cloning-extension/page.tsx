import type { RouteConfig } from "@mercurjs/dashboard-sdk";
import {
  Button,
  Container,
  Heading,
  Select,
  Table,
  Text,
  Toaster,
  toast,
  Checkbox,
  Input,
  Tabs,
  Badge,
  Tooltip,
} from "@medusajs/ui";
import { CloneDashed } from "@medusajs/icons";
import { useState, useEffect, useRef } from "react";
import { useQuery } from "@tanstack/react-query";
import React from "react";

const SELLER_LIST_LIMIT = 500;
const SELLER_PRODUCTS_LIMIT = 500;

const adminFetchInit: RequestInit = { credentials: "include" };

async function adminGetJson<T>(path: string): Promise<T> {
  const res = await fetch(path, adminFetchInit);
  if (!res.ok) throw new Error(`Request failed: ${res.status}`);
  return res.json() as Promise<T>;
}

async function adminPostJson<T>(path: string, body: unknown): Promise<T> {
  const res = await fetch(path, {
    ...adminFetchInit,
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
  if (!res.ok) throw new Error(`Request failed: ${res.status}`);
  return res.json() as Promise<T>;
}

// Custom hook to replace useAdminCustomQuery with proper typing (fetch + session cookies)
const useAdminCustomQuery = <T extends Record<string, unknown>>(
  endpoint: string,
  queryKey: unknown[],
  options: { enabled?: boolean } = {}
) => {
  return useQuery<T>({
    queryKey,
    queryFn: () => adminGetJson<T>(`/admin${endpoint}`),
    ...options,
  });
};

// Define types for our component
type Seller = {
  id: string;
  name: string;
};

type Variant = {
  id: string;
  title: string;
  sku: string;
};

type Product = {
  id: string;
  title: string;
  brand?: string;
  category?: string;
  selected?: boolean;
  categories?: {
    name: string;
  }[];
  variants?: Variant[];
  showVariants?: boolean;
};

// type Product = {
//   id: string;
//   title: string;
//   sku: string;
//   brand?: string;
//   category?: string;
//   selected?: boolean;
//   categories?: {
//     name: string;
//   }[];
// };

type Filter = {
  brand: string;
  category: string;
};

type ProductCloneJobStatus = {
  status: "created" | "processing" | "completed" | "failed";
  progress: number;
  result?: {
    successful: string[];
    failed: { id: string; error: string }[];
    total: number;
    successful_count: number;
    failed_count: number;
    error?: string;
  };
};



const ProductCloningExtensionPage = () => {
  // Helper function to create a CSV blob with header
  const createCsvBlob = (header: string[]) => {
    const csvContent = header.join(',') + '\n';
    return new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
  };
  // State for sellers, products, and selections
  const [sellers, setSellers] = useState<Seller[]>([]);
  const [sourceSeller, setSourceSeller] = useState<string>("");
  const [targetSeller, setTargetSeller] = useState<string>("");
  const [products, setProducts] = useState<Product[]>([]);
  const [filteredProducts, setFilteredProducts] = useState<Product[]>([]);
  const [selectedProducts, setSelectedProducts] = useState<string[]>([]);
  const [selectAll, setSelectAll] = useState<boolean>(false);
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [brands, setBrands] = useState<string[]>([]);
  const [categories, setCategories] = useState<string[]>([]);
  const [filters, setFilters] = useState<Filter>({ brand: "", category: "" });
  const [skuSearch, setSkuSearch] = useState<string>("");
  

  // CSV Bulk Cloning states
  const [validSkus, setValidSkus] = useState<{sku: string, productId: string}[]>([]);
  const [invalidSkus, setInvalidSkus] = useState<{sku: string, reason: string}[]>([]);
  const [skippedSkus, setSkippedSkus] = useState<{sku: string, reason: string}[]>([]);
  const [isProcessing, setIsProcessing] = useState<boolean>(false);
  const [showResults, setShowResults] = useState<boolean>(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [csvFile, setCsvFile] = useState<File | null>(null);
  const [parsedSkus, setParsedSkus] = useState<string[]>([]);

  // Function to handle CSV file upload and parsing
  const handleCsvFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    setIsProcessing(true);
    setShowResults(false);
    
    const reader = new FileReader();
    reader.onload = async (e) => {
      try {
        const text = e.target?.result as string;
        const lines = text.split('\n');
        
        // Find the header row and locate the SKU column
        const headerRow = lines[0].split(',').map(h => h.trim().toLowerCase());
        const skuColumnIndex = headerRow.indexOf('sku');
        
        if (skuColumnIndex === -1) {
          toast.error('CSV file must contain a column named "sku"');
          setIsProcessing(false);
          return;
        }
        
        // Extract SKUs from the file
        const skus = lines.slice(1)
          .map(line => {
            const columns = line.split(',');
            return columns[skuColumnIndex]?.trim();
          })
          .filter(Boolean) as string[];
        
        if (skus.length === 0) {
          toast.error('No SKUs found in the CSV file');
          setIsProcessing(false);
          return;
        }
        
        // Validate SKUs against source seller products
        await validateSkus(skus);
        
      } catch (error) {
        console.error('Error parsing CSV:', error);
        toast.error('Error parsing CSV file');
        setIsProcessing(false);
      }
    };
    
    reader.onerror = () => {
      toast.error('Error reading CSV file');
      setIsProcessing(false);
    };
    
    reader.readAsText(file);
  };
  
  // Function to validate SKUs against source seller products
  const validateSkus = async (skus: string[]) => {
    try {
      const qs = `?limit=${SELLER_PRODUCTS_LIMIT}`;
      const [sourceRes, targetRes] = await Promise.all([
        adminGetJson<{ products?: Product[] }>(`/admin/sellers/${sourceSeller}/products${qs}`),
        adminGetJson<{ products?: Product[] }>(`/admin/sellers/${targetSeller}/products${qs}`),
      ]);

      const sourceProducts = sourceRes.products || [];
      const targetProducts = targetRes.products || [];
  
      const valid: { sku: string; productId: string }[] = [];
      const invalid: { sku: string; reason: string }[] = [];
      const skipped: { sku: string; reason: string }[] = [];
  
      const targetSkus = new Set(
        targetProducts.flatMap((product: Product) =>
          product.variants?.map((variant: Variant) => variant.sku?.trim())
        )
      );
  
      const processedSkus = new Set<string>();
  
      skus.forEach((sku) => {
        const trimmedSku = sku.trim();
  
        if (processedSkus.has(trimmedSku)) {
          skipped.push({ sku: trimmedSku, reason: "Duplicate SKU in CSV file" });
          return;
        }
  
        processedSkus.add(trimmedSku);
  
        // Check if SKU exists in target seller
        if (targetSkus.has(trimmedSku)) {
          skipped.push({
            sku: trimmedSku,
            reason: "SKU already exists in target seller",
          });
          return;
        }
  
        // Check if SKU exists in source seller
        const matchingProduct = sourceProducts.find((product: Product) =>
          product.variants?.some((variant: Variant) => variant.sku === trimmedSku)
        );
  
        if (matchingProduct) {
          valid.push({ sku: trimmedSku, productId: matchingProduct.id });
        } else {
          invalid.push({
            sku: trimmedSku,
            reason: "SKU not found in source seller catalog",
          });
        }
      });
  
      setValidSkus(valid);
      setInvalidSkus(invalid);
      setSkippedSkus(skipped);
      setShowResults(true);
      setIsProcessing(false);
  
      if (valid.length === 0) {
        toast.error("No valid SKUs found for cloning");
      } else {
        toast.success(`Found ${valid.length} valid SKUs ready for cloning`);
      }
    } catch (error) {
      console.error("Error validating SKUs:", error);
      toast.error("Error validating SKUs");
      setIsProcessing(false);
    }
  };  
  
  // Function to download sample CSV template
  const handleDownloadSampleCsv = () => {
    const blob = createCsvBlob(['sku']);
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'product_skus_template.csv';
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };
  
  // State for job tracking
  const [jobStatus, setJobStatus] = useState<ProductCloneJobStatus | null>(null);
  const pollingRef = useRef<ReturnType<typeof setInterval> | null>(null);

  // Function to poll job status
  const startJobStatusPolling = (id: string) => {
    if (pollingRef.current) {
      clearInterval(pollingRef.current);
      pollingRef.current = null;
    }

    pollingRef.current = setInterval(async () => {
      try {
        const data = await adminGetJson<{
          success?: boolean;
          job?: {
            status: string;
            progress: number;
            result?: {
              successful_count?: number;
              failed_count?: number;
              error?: string;
            };
          };
        }>(`/admin/products/bulk-clone/${id}/status`);

        if (data.success && data.job) {
          const job = data.job;
          setJobStatus(job as ProductCloneJobStatus);

          if (job.status === "completed" || job.status === "failed") {
            if (pollingRef.current) {
              clearInterval(pollingRef.current);
              pollingRef.current = null;
            }
            setIsProcessing(false);

            if (job.status === "completed") {
              const result = job.result;
              if (result) {
                toast.success(
                  `Successfully cloned ${result.successful_count} products to target seller`
                );
                if (result.failed_count && result.failed_count > 0) {
                  toast.warning(`${result.failed_count} products failed to clone`);
                }
              } else {
                toast.success("Bulk cloning completed");
              }
            } else if (job.status === "failed") {
              toast.error(`Job failed: ${job.result?.error || "Unknown error"}`);
            }
          }
        }
      } catch (error) {
        console.error("Error polling job status:", error);
      }
    }, 2000);
  };

  useEffect(() => {
    return () => {
      if (pollingRef.current) {
        clearInterval(pollingRef.current);
        pollingRef.current = null;
      }
    };
  }, []);
  
  // Function to handle bulk cloning of products
  const handleBulkClone = async () => {
    if (validSkus.length === 0 || !targetSeller) return;
    
    setIsProcessing(true);
    setJobStatus(null);
    
    try {
      // Get unique product IDs (in case multiple SKUs belong to same product)
      const uniqueProductIds = [...new Set(validSkus.map((item) => item.productId))];
      
      // Call the bulk-clone API endpoint to start a job
      const response = await adminPostJson<{
        success?: boolean;
        job_id?: string;
      }>("/admin/products/bulk-clone", {
        target_seller_id: targetSeller,
        product_ids: uniqueProductIds,
      });

      if (response.success && response.job_id) {
        toast.success("Bulk cloning job started");

        startJobStatusPolling(response.job_id);
      } else {
        toast.error('Failed to start bulk cloning job');
        setIsProcessing(false);
      }
    } catch (error) {
      console.error('Error starting bulk clone job:', error);
      toast.error('Error starting bulk clone job');
      setIsProcessing(false);
    }
  };

  // Toast is imported directly from @medusajs/ui

  // Fetch all sellers when component mounts
  const { data: sellersData, isLoading: isLoadingSellers } = useAdminCustomQuery<{ sellers: Seller[] }>(
    `/sellers?limit=${SELLER_LIST_LIMIT}`,
    ["sellers", "product-cloning-extension"]
  );

  useEffect(() => {
    if (sellersData) {
      setSellers(sellersData.sellers || []);
    }
  }, [sellersData]);

  // Fetch products for the selected source seller
  const { data: productsData, isLoading: isLoadingProducts } = useAdminCustomQuery<{ products: Product[] }>(
    `/sellers/${sourceSeller}/products?limit=${SELLER_PRODUCTS_LIMIT}`,
    ["seller-products", sourceSeller, "product-cloning-extension"],
    {
      enabled: !!sourceSeller,
    }
  );


  useEffect(() => {
    if (productsData) {
      const productsWithSelection = (productsData.products || []).map((product: Product) => ({
        ...product,
        selected: false,
      }));
      setProducts(productsWithSelection);
      setFilteredProducts(productsWithSelection);


      // Extract unique brands and categories
      const uniqueBrands = [...new Set(productsWithSelection.map(p => p.brand).filter(Boolean))] as string[];
      const uniqueCategories = [...new Set(productsWithSelection.map(p => p.categories?.[0]?.name).filter((name): name is string => Boolean(name)))] as string[];
      setBrands(uniqueBrands);
      setCategories(uniqueCategories);
    }
  }, [productsData]);

  // Handle source seller change
  const handleSourceSellerChange = (value: string) => {
    setSourceSeller(value);
    setTargetSeller("");
    setSelectedProducts([]);
    setSelectAll(false);
    setFilters({ brand: "", category: "" });
    // Reset CSV states
    setCsvFile(null);
    setParsedSkus([]);
    setValidSkus([]);
    setInvalidSkus([]);
    setSkippedSkus([]);
    setShowResults(false);
    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
  };

  // Handle target seller change
  const handleTargetSellerChange = (value: string) => {
    setTargetSeller(value);
  };

  // Handle product selection
  const handleProductSelection = (productId: string) => {
    setSelectedProducts(prev => {
      if (prev.includes(productId)) {
        return prev.filter(id => id !== productId);
      } else {
        return [...prev, productId];
      }
    });
  };

  // Handle select all products
  const handleSelectAll = () => {
    if (selectAll) {
      setSelectedProducts([]);
    } else {
      setSelectedProducts(filteredProducts.map(product => product.id));
    }
    setSelectAll(!selectAll);
  };

  // Apply filters
  useEffect(() => {
    if (products.length) {
      let filtered = [...products];

      if (filters.brand) {
        filtered = filtered.filter(p => p.brand === filters.brand);
      }

      if (filters.category) {
        filtered = filtered.filter(p => p.categories?.[0]?.name === filters.category);
      }

      if (skuSearch) {
        filtered = filtered.filter(p =>
          p.variants?.some(v => v.sku?.toLowerCase().includes(skuSearch.toLowerCase()))
        );
      }

      setFilteredProducts(filtered);

      // Reset selection when filters change
      setSelectedProducts([]);
      setSelectAll(false);
    }
  }, [filters, skuSearch, products]);

  // Handle filter change
  const handleFilterChange = (type: keyof Filter, value: string) => {
    setFilters(prev => ({
      ...prev,
      [type]: value === "__all__" ? "" : value
    }));
  };

  // Handle select all by brand
  const handleSelectByBrand = (brand: string) => {
    const productsByBrand = products.filter(p => p.brand === brand).map(p => p.id);
    setSelectedProducts(prev => {
      const newSelection = new Set([...prev, ...productsByBrand]);
      return Array.from(newSelection);
    });
  };

  // Handle select all by category
  const handleSelectByCategory = (category: string) => {
    const productsByCategory = products.filter(p => p.categories?.[0]?.name === category).map(p => p.id);
    setSelectedProducts(prev => {
      const newSelection = new Set([...prev, ...productsByCategory]);
      return Array.from(newSelection);
    });
  };

  const toggleShowVariants = (productId: string) => {
    setProducts(prev => prev.map(p => p.id === productId ? { ...p, showVariants: !p.showVariants } : p));
  };

  // Clone selected products
  // const handleCloneProducts = async () => {
  //   setIsLoading(true);
  //   try {
  //     console.log("Selected products:", selectedProducts);

  //     // Use the workflow-based approach to link products to the target seller
  //     const response = await axios.post("/admin/products/link-catalog", {
  //       source_seller_id: sourceSeller,
  //       target_seller_id: targetSeller,
  //       product_ids: selectedProducts
  //     });

  //     console.log("Response from backend:", response.data);

  //     if (response.status === 200) {
  //       toast.success("Products linked to target seller successfully!");
  //       setSelectedProducts([]);
  //       setSelectAll(false);
  //     } else {
  //       toast.error("Failed to link products. Please try again.");
  //     }
  //   } catch (error) {
  //     console.error("Error linking products:", error);
  //     toast.error("An error occurred while linking products to the target seller.");
  //   } finally {
  //     setIsLoading(false);
  //   }
  // };

  // // Clone entire catalog using workflow-based approach
  // const handleCloneEntireCatalog = async () => {
  //   setIsLoading(true);
  //   try {
  //     // Get all products from the source seller
  //     const productsResponse = await axios.get(`/admin/sellers/${sourceSeller}/products`);
  //     const allProducts = productsResponse.data.products || [];

  //     if (allProducts.length === 0) {
  //       toast.warning("No products found for the source seller.");
  //       return;
  //     }

  //     console.log("All products:", allProducts);

  //     // Use the workflow-based approach to link products to the target seller
  //     const response = await axios.post("/admin/products/link-catalog", {
  //       source_seller_id: sourceSeller,
  //       target_seller_id: targetSeller,
  //       product_ids: allProducts.map((product: Product) => product.id)
  //     });

  //     console.log("Response from backend:", response.data);

  //     if (response.status === 200) {
  //       toast.success("Catalog linked to target seller successfully!");
  //     } else {
  //       toast.error("Failed to link catalog. Please try again.");
  //     }
  //   } catch (error) {
  //     console.error("Error linking catalog:", error);
  //     toast.error("An error occurred while linking the catalog to the target seller.");
  //   } finally {
  //     setIsLoading(false);
  //   }
  // };

  const handleClone = async (productIds: string[]) => {
    if (!targetSeller) {
      toast.error("Please select a target seller.");
      return;
    }

    setIsLoading(true);
    try {
      if (productIds.length === 0) {
        toast.warning("No products selected to clone.");
        return;
      }

      await adminPostJson("/admin/products/link-catalog", {
        source_seller_id: sourceSeller,
        target_seller_id: targetSeller,
        product_ids: productIds,
      });

      toast.success("Products linked to target seller successfully!");
      setSelectedProducts([]);
      setSelectAll(false);
    } catch (error) {
      console.error("Error linking products:", error);
      toast.error("An error occurred while linking products to the target seller.");
    } finally {
      setIsLoading(false);
    }
  };

  const handleCloneProducts = () => {
    handleClone(selectedProducts);
  };

  const handleCloneEntireCatalog = async () => {
    setIsLoading(true);
    try {
      const productsResponse = await adminGetJson<{ products?: Product[] }>(
        `/admin/sellers/${sourceSeller}/products?limit=${SELLER_PRODUCTS_LIMIT}`
      );
      const allProducts = productsResponse.products || [];

      if (allProducts.length === 0) {
        toast.warning("No products found for the source seller.");
        return;
      }

      const allProductIds = allProducts.map((product: Product) => product.id);
      handleClone(allProductIds);
    } catch (error) {
      console.error("Error fetching products for source seller:", error);
      toast.error("Failed to fetch products for the source seller.");
      setIsLoading(false);
    }
  };

  return (
    <>
      <Toaster />
      <Container>
        <div className="flex items-center justify-between px-6 py-4">
          <div>
            <Heading>Product Cloning Extension</Heading>
            <Text className="text-ui-fg-subtle mt-1">
              Clone products between sellers at SKU level or entire catalog
            </Text>
          </div>
        </div>

        <div className="bg-white p-6 rounded-lg shadow-md mb-6">
          <Tabs defaultValue="custom">
            <Tabs.List>
              <Tabs.Trigger value="custom">Custom Cloning</Tabs.Trigger>
              <Tabs.Trigger value="bulk">Bulk Cloning</Tabs.Trigger>
            </Tabs.List>
            <hr className="my-6" />
            <Tabs.Content value="custom">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6 mt-6">
                <div>
                  <Text className="font-semibold mb-2">Source Seller (Original)</Text>
                  <Select
                    value={sourceSeller}
                    onValueChange={handleSourceSellerChange}
                    disabled={isLoadingSellers || isLoading}
                  >
                    <Select.Trigger>
                      <Select.Value placeholder="Select source seller" />
                    </Select.Trigger>
                    <Select.Content>
                      {sellers.map((seller) => (
                        <Select.Item key={seller.id} value={seller.id}>
                          {seller.name}
                        </Select.Item>
                      ))}
                    </Select.Content>
                  </Select>
                </div>
                <div>
                  <Text className="font-semibold mb-2">Target Seller (Clone To)</Text>
                  <Select
                    value={targetSeller}
                    onValueChange={handleTargetSellerChange}
                    disabled={!sourceSeller || isLoadingSellers || isLoading}
                  >
                    <Select.Trigger>
                      <Select.Value placeholder="Select target seller" />
                    </Select.Trigger>
                    <Select.Content>
                      {sellers
                        .filter((seller) => seller.id !== sourceSeller)
                        .map((seller) => (
                          <Select.Item key={seller.id} value={seller.id}>
                            {seller.name}
                          </Select.Item>
                        ))}
                    </Select.Content>
                  </Select>
                </div>
              </div>

              {sourceSeller && (
                <div className="mb-6">
                  <Button
                    variant="secondary"
                    onClick={handleCloneEntireCatalog}
                    disabled={!targetSeller || isLoading}
                    className="mr-2"
                  >
                    Clone Entire Catalog
                  </Button>
                  <Text className="text-ui-fg-subtle mt-2">
                    This will clone all products from the source seller to the target seller in a single operation.
                  </Text>
                </div>
              )}

              {sourceSeller && (
                <div className="border-t pt-6">
                  <Heading className="text-xl mb-4">SKU-Level Cloning</Heading>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
                    <div>
                      <Text className="font-semibold mb-2">Filter by Brand</Text>
                      <Select
                        value={filters.brand}
                        onValueChange={(value) => handleFilterChange("brand", value)}
                        disabled={isLoadingProducts || isLoading}
                      >
                        <Select.Trigger>
                          <Select.Value placeholder="Select brand" />
                        </Select.Trigger>
                        <Select.Content>
                          <Select.Item value="__all__">All Brands</Select.Item>
                          {brands.map((brand) => (
                            <Select.Item key={brand} value={brand}>
                              {brand}
                            </Select.Item>
                          ))}
                        </Select.Content>
                      </Select>
                      {filters.brand && (
                        <Button
                          variant="secondary"
                          size="small"
                          className="mt-2"
                          onClick={() => handleSelectByBrand(filters.brand)}
                        >
                          Select All {filters.brand} Products
                        </Button>
                      )}
                    </div>
                    <div>
                      <Text className="font-semibold mb-2">Filter by Category</Text>
                      <Select
                        value={filters.category}
                        onValueChange={(value) => handleFilterChange("category", value)}
                        disabled={isLoadingProducts || isLoading}
                      >
                        <Select.Trigger>
                          <Select.Value placeholder="Select category" />
                        </Select.Trigger>
                        <Select.Content>
                          <Select.Item value="__all__">All Categories</Select.Item>
                          {categories.map((category) => (
                            <Select.Item key={category} value={category}>
                              {category}
                            </Select.Item>
                          ))}
                        </Select.Content>
                      </Select>
                      {filters.category && (
                        <Button
                          variant="secondary"
                          size="small"
                          className="mt-2"
                          onClick={() => handleSelectByCategory(filters.category)}
                        >
                          Select All {filters.category} Products
                        </Button>
                      )}
                    </div>
                  </div>

                  <div className="flex justify-between items-center mb-4">
                    <div className="flex items-center">
                      <Checkbox
                        checked={selectAll}
                        onCheckedChange={handleSelectAll}
                        disabled={filteredProducts.length === 0 || isLoading}
                      />
                      <Text className="ml-2">Select All ({filteredProducts.length} products)</Text>
                    </div>
                    <div>
                      <Button
                        variant="primary"
                        onClick={handleCloneProducts}
                        disabled={selectedProducts.length === 0 || !targetSeller || isLoading}
                      >
                        {isLoading ? "Cloning..." : `Clone ${selectedProducts.length} Selected Products`}
                      </Button>
                    </div>
                  </div>

                  <Input
                    placeholder="Search by SKU"
                    value={skuSearch}
                    onChange={(e) => setSkuSearch(e.target.value)}
                    className="mb-4"
                  />

                  <div className="flex size-full flex-col overflow-hidden">
                    {isLoadingProducts ? (
                      <Text>Loading products...</Text>
                    ) : filteredProducts.length === 0 ? (
                      <Text>No products found for the selected filters.</Text>
                    ) : (
                      // <Table>
                      //   <Table.Header>
                      //     <Table.Row>
                      //       <Table.HeaderCell>Select</Table.HeaderCell>
                      //       <Table.HeaderCell>SKU</Table.HeaderCell>
                      //       <Table.HeaderCell>Product Title</Table.HeaderCell>
                      //       <Table.HeaderCell>Brand</Table.HeaderCell>
                      //       <Table.HeaderCell>Category</Table.HeaderCell>
                      //     </Table.Row>
                      //   </Table.Header>
                      //   <Table.Body>
                      //     {filteredProducts.map((product) => (
                      //       <Table.Row key={product.id}>
                      //         <Table.Cell>
                      //           <Checkbox 
                      //             checked={selectedProducts.includes(product.id)} 
                      //             onCheckedChange={() => handleProductSelection(product.id)}
                      //             disabled={isLoading}
                      //           />
                      //         </Table.Cell>
                      //         <Table.Cell>{product.sku}</Table.Cell>
                      //         <Table.Cell>{product.title}</Table.Cell>
                      //         <Table.Cell>{product.brand || "N/A"}</Table.Cell>
                      //         <Table.Cell>{product.categories?.[0]?.name || "N/A"}</Table.Cell>
                      //       </Table.Row>
                      //     ))}
                      //   </Table.Body>
                      // </Table>
                      <Table>
                        <Table.Header>
                          <Table.Row>
                            <Table.HeaderCell>Select</Table.HeaderCell>
                            <Table.HeaderCell>SKU</Table.HeaderCell>
                            <Table.HeaderCell>Product Title</Table.HeaderCell>
                            <Table.HeaderCell>Brand</Table.HeaderCell>
                            <Table.HeaderCell>Category</Table.HeaderCell>
                          </Table.Row>
                        </Table.Header>
                        <Table.Body>
                          {filteredProducts.map((product) => (
                            <React.Fragment key={product.id}>
                              <Table.Row key={product.id}>
                                <Table.Cell>
                                  <Checkbox
                                    checked={selectedProducts.includes(product.id)}
                                    onCheckedChange={() => handleProductSelection(product.id)}
                                    disabled={isLoading}
                                  />
                                </Table.Cell>
                                <Table.Cell>
                                  <Button
                                    variant="secondary"
                                    size="small"
                                    onClick={() => toggleShowVariants(product.id)}
                                  >
                                    {product.showVariants ? "▼" : "▶"}
                                  </Button>
                                </Table.Cell>
                                <Table.Cell>{product.title}</Table.Cell>
                                <Table.Cell>{product.brand || "N/A"}</Table.Cell>
                                <Table.Cell>{product.categories?.[0]?.name || "N/A"}</Table.Cell>
                              </Table.Row>
                              {product.showVariants && product.variants?.map((variant) => (
                                <Table.Row key={variant.id} className="bg-gray-50">
                                  {/* <Table.Cell /> */}
                                  <Table.Cell>{variant.title}</Table.Cell>
                                  <Table.Cell>{variant.sku}</Table.Cell>
                                  <Table.Cell />
                                  <Table.Cell />
                                  <Table.Cell />
                                </Table.Row>
                              ))}
                            </React.Fragment>
                          ))}
                        </Table.Body>
                      </Table>
                    )}
                  </div>
                </div>
              )}
            </Tabs.Content>
            <Tabs.Content value="bulk">
              <div className="flex flex-col gap-4 mt-4">
                <div className="flex flex-row gap-4">
                  <div className="w-1/2">
                    <Text className="mb-2">Source Seller</Text>
                    <Select
                      value={sourceSeller}
                      onValueChange={handleSourceSellerChange}
                      disabled={isLoading || isProcessing}
                    >
                      <Select.Trigger>
                        <Select.Value placeholder="Select Source Seller" />
                      </Select.Trigger>
                      <Select.Content>
                        {sellers.map((seller) => (
                          <Select.Item key={seller.id} value={seller.id}>
                            {seller.name}
                          </Select.Item>
                        ))}
                      </Select.Content>
                    </Select>
                  </div>
                  <div className="w-1/2">
                    <Text className="mb-2">Target Seller</Text>
                    <Select
                      value={targetSeller}
                      onValueChange={handleTargetSellerChange}
                      disabled={!sourceSeller || isLoading || isProcessing}
                    >
                      <Select.Trigger>
                        <Select.Value placeholder="Select Target Seller" />
                      </Select.Trigger>
                      <Select.Content>
                        {sellers
                          .filter((seller) => seller.id !== sourceSeller)
                          .map((seller) => (
                            <Select.Item key={seller.id} value={seller.id}>
                              {seller.name}
                            </Select.Item>
                          ))}
                      </Select.Content>
                    </Select>
                  </div>
                </div>
                
                <div className="flex flex-col gap-2 mt-4">
                  <div className="flex flex-row items-center gap-2">
                    <Text className="font-medium">Upload CSV File</Text>
                    <Tooltip content="Download a sample CSV template with SKU header">
                      <Button
                        variant="secondary"
                        size="small"
                        onClick={handleDownloadSampleCsv}
                      >
                        Download Template
                      </Button>
                    </Tooltip>
                  </div>
                  <Text className="text-sm text-gray-500 mb-2">
                    Upload a CSV file with a column header named 'sku' containing product SKUs to clone
                  </Text>
                  <Input
                    type="file"
                    ref={fileInputRef}
                    accept=".csv"
                    placeholder="Select CSV file"
                    onChange={handleCsvFileChange}
                    disabled={!sourceSeller || !targetSeller || isLoading || isProcessing}
                  />
                </div>
                
                {showResults && (
                  <div className="mt-4">
                    <div className="flex flex-row gap-4 mb-4">
                      <Badge className="bg-green-100 text-green-800">
                        Valid SKUs: {validSkus.length}
                      </Badge>
                      <Badge className="bg-red-100 text-red-800">
                        Invalid SKUs: {invalidSkus.length}
                      </Badge>
                      <Badge className="bg-yellow-100 text-yellow-800">
                        Skipped SKUs: {skippedSkus.length}
                      </Badge>
                    </div>
                    
                    <Tabs defaultValue="valid">
                      <Tabs.List>
                        <Tabs.Trigger value="valid">Valid SKUs ({validSkus.length})</Tabs.Trigger>
                        <Tabs.Trigger value="invalid">Invalid SKUs ({invalidSkus.length})</Tabs.Trigger>
                        <Tabs.Trigger value="skipped">Skipped SKUs ({skippedSkus.length})</Tabs.Trigger>
                      </Tabs.List>
                      <Tabs.Content value="valid" className="py-2">
                        {validSkus.length > 0 ? (
                          <Table>
                            <Table.Header>
                              <Table.Row>
                                <Table.HeaderCell>SKU</Table.HeaderCell>
                                <Table.HeaderCell>Product ID</Table.HeaderCell>
                              </Table.Row>
                            </Table.Header>
                            <Table.Body>
                              {validSkus.map((item) => (
                                <Table.Row key={item.sku}>
                                  <Table.Cell>{item.sku}</Table.Cell>
                                  <Table.Cell>{item.productId}</Table.Cell>
                                </Table.Row>
                              ))}
                            </Table.Body>
                          </Table>
                        ) : (
                          <Text>No valid SKUs found.</Text>
                        )}
                      </Tabs.Content>
                      <Tabs.Content value="invalid" className="py-2">
                        {invalidSkus.length > 0 ? (
                          <Table>
                            <Table.Header>
                              <Table.Row>
                                <Table.HeaderCell>SKU</Table.HeaderCell>
                                <Table.HeaderCell>Reason</Table.HeaderCell>
                              </Table.Row>
                            </Table.Header>
                            <Table.Body>
                              {invalidSkus.map((item) => (
                                <Table.Row key={item.sku}>
                                  <Table.Cell>{item.sku}</Table.Cell>
                                  <Table.Cell>{item.reason}</Table.Cell>
                                </Table.Row>
                              ))}
                            </Table.Body>
                          </Table>
                        ) : (
                          <Text>No invalid SKUs found.</Text>
                        )}
                      </Tabs.Content>
                      <Tabs.Content value="skipped" className="py-2">
                        {skippedSkus.length > 0 ? (
                          <Table>
                            <Table.Header>
                              <Table.Row>
                                <Table.HeaderCell>SKU</Table.HeaderCell>
                                <Table.HeaderCell>Reason</Table.HeaderCell>
                              </Table.Row>
                            </Table.Header>
                            <Table.Body>
                              {skippedSkus.map((item) => (
                                <Table.Row key={item.sku}>
                                  <Table.Cell>{item.sku}</Table.Cell>
                                  <Table.Cell>{item.reason}</Table.Cell>
                                </Table.Row>
                              ))}
                            </Table.Body>
                          </Table>
                        ) : (
                          <Text>No skipped SKUs found.</Text>
                        )}
                      </Tabs.Content>
                    </Tabs>
                    
                    <div className="flex justify-end mt-4">
                      {validSkus.length > 0 && targetSeller && (
                        <div className="flex flex-col gap-y-2">
                          <Button
                            variant="primary"
                            size="small"
                            onClick={handleBulkClone}
                            disabled={isProcessing}
                          >
                            {isProcessing ? "Processing..." : `Clone ${validSkus.length} Products`}
                          </Button>
                          
                          {/* Job Status Display */}
                          {jobStatus && (
                            <div className="mt-2">
                              <div className="flex items-center gap-x-2">
                                <Text size="small" className="text-ui-fg-subtle">
                                  Status: <span className="font-medium">{jobStatus.status}</span>
                                </Text>
                                {jobStatus.status === "processing" && (
                                  <div className="animate-pulse h-2 w-2 rounded-full bg-orange-500"></div>
                                )}
                                {jobStatus.status === "completed" && (
                                  <div className="h-2 w-2 rounded-full bg-green-500"></div>
                                )}
                                {jobStatus.status === "failed" && (
                                  <div className="h-2 w-2 rounded-full bg-red-500"></div>
                                )}
                              </div>
                              
                              {/* Progress Bar */}
                              {jobStatus.status === "processing" && (
                                <div className="w-full bg-gray-200 rounded-full h-2.5 mt-2">
                                  <div 
                                    className="bg-blue-600 h-2.5 rounded-full" 
                                    style={{ width: `${jobStatus.progress}%` }}
                                  ></div>
                                </div>
                              )}
                              
                              {/* Results Summary */}
                              {jobStatus.status === "completed" && jobStatus.result && (
                                <div className="mt-2 text-sm">
                                  <Text size="small">
                                    Successfully cloned: {jobStatus.result.successful_count} products
                                  </Text>
                                  {jobStatus.result.failed_count > 0 && (
                                    <Text size="small" className="text-ui-fg-error">
                                      Failed: {jobStatus.result.failed_count} products
                                    </Text>
                                  )}
                                </div>
                              )}
                              
                              {/* Error Message */}
                              {jobStatus.status === "failed" && jobStatus.result?.error && (
                                <Text size="small" className="text-ui-fg-error mt-2">
                                  Error: {jobStatus.result.error}
                                </Text>
                              )}
                            </div>
                          )}
                        </div>
                      )}
                    </div>
                  </div>
                )}
              </div>
            </Tabs.Content>
          </Tabs>
        </div>
      </Container>
    </>
  );
};

export const config: RouteConfig = {
  label: "Product Cloning Extension",
  icon: CloneDashed,
};

export default ProductCloningExtensionPage;
