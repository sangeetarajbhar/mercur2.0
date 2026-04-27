import { useNavigate, useParams } from "react-router-dom";
import { Container, Heading, Text, Table, Button } from "@medusajs/ui";
import { useEffect, useState } from "react";
import { ArrowLeft } from "@medusajs/icons";

import { useBrand } from "../../../hooks/api/brands";

type Product = {
  id: string;
  title: string;
  status: string;
};

const BrandDetailsPage = () => {
  const { id } = useParams();
  const navigate = useNavigate();

  const { data: brand, isLoading: isBrandLoading } = useBrand(id ?? "");

  const [products, setProducts] = useState<Product[]>([]);
  const [isProductsLoading, setIsProductsLoading] = useState(true);

  useEffect(() => {
    const fetchProducts = async () => {
      if (!id) return;
      try {
        const response = await fetch(`/admin/products?brand_id=${id}`, {
          credentials: "include",
        });
        const data = await response.json();
        if (data.products) setProducts(data.products);
      } catch (err) {
        // ###### brand-products fetch failure, leave list empty
        console.error("Failed to fetch brand products:", err);
      } finally {
        setIsProductsLoading(false);
      }
    };

    fetchProducts();
  }, [id]);

  if (isBrandLoading) {
    return (
      <Container>
        <div className="flex items-center justify-center h-screen">
          <Text>Loading brand details...</Text>
        </div>
      </Container>
    );
  }

  if (!brand) {
    return (
      <Container>
        <div className="flex items-center justify-center h-screen">
          <Text>Brand not found</Text>
        </div>
      </Container>
    );
  }

  return (
    <Container>
      <div className="py-6">
        <Button
          variant="transparent"
          size="small"
          onClick={() => navigate("/brands")}
        >
          <ArrowLeft className="mr-1" />
          Back to Brands
        </Button>
      </div>

      <div className="mb-8">
        <Heading level="h1" className="mb-2">
          Brand Details
        </Heading>
        <div className="grid grid-cols-2 gap-4 mb-4">
          <div>
            <Text className="text-ui-fg-subtle mb-1">Brand ID</Text>
            <Text>{brand.id}</Text>
          </div>
          <div>
            <Text className="text-ui-fg-subtle mb-1">Brand Name</Text>
            <Text>{brand.name}</Text>
          </div>
          <div>
            <Text className="text-ui-fg-subtle mb-1">Brand Handle</Text>
            <Text>{brand.handle || "-"}</Text>
          </div>
        </div>
      </div>

      <div>
        <Heading level="h2" className="mb-4">
          Products
        </Heading>
        {isProductsLoading ? (
          <Text>Loading products...</Text>
        ) : products && products.length > 0 ? (
          <Table>
            <Table.Header>
              <Table.Row>
                <Table.HeaderCell>ID</Table.HeaderCell>
                <Table.HeaderCell>Title</Table.HeaderCell>
                <Table.HeaderCell>Status</Table.HeaderCell>
              </Table.Row>
            </Table.Header>
            <Table.Body>
              {products.map((product) => (
                <Table.Row
                  key={product.id}
                  className="cursor-pointer"
                  onClick={() => navigate(`/products/${product.id}`)}
                >
                  <Table.Cell>{product.id}</Table.Cell>
                  <Table.Cell>
                    <Text className="text-ui-fg-interactive">
                      {product.title}
                    </Text>
                  </Table.Cell>
                  <Table.Cell>{product.status}</Table.Cell>
                </Table.Row>
              ))}
            </Table.Body>
          </Table>
        ) : (
          <Text>No products associated with this brand</Text>
        )}
      </div>
    </Container>
  );
};

export default BrandDetailsPage;
