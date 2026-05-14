import { Text } from "@medusajs/ui"
import { useNavigate, useParams } from "react-router-dom"
import { useSeller } from "../../../../hooks/api/sellers"
import { SellerForm } from "../../create/SellerForm"

export default function SellerEditPage() {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const { data, isLoading } = useSeller(id || "")

  if (isLoading) {
    return <Text>Loading...</Text>
  }

  return (
    <SellerForm
      key={id}
      sellerId={id}
      sellerData={data?.seller}
      onClose={() => navigate(-1)}
      open
    />
  )
}

