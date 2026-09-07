import { Container, Text } from "@medusajs/ui";
import { useParams } from "react-router-dom";

import { useTier } from "../../../hooks/api/tiers";
import { TierCustomersTable } from "../components/tier-customers-table";
import { TierDetailsSection } from "../components/tier-details-section";
import { TierRulesTable } from "../components/tier-rules-table";

const TierDetailsPage = () => {
  const { id } = useParams<{ id: string }>();

  const { data: tier, isLoading, error } = useTier(id ?? "");

  if (isLoading) {
    return (
      <Container>
        <Text>Loading tier details...</Text>
      </Container>
    );
  }

  if (error || !tier) {
    return (
      <Container>
        <Text>Tier not found</Text>
      </Container>
    );
  }

  return (
    <div className="flex flex-col gap-y-3">
      <TierDetailsSection tier={tier} />
      {tier?.tier_rules && tier.tier_rules.length > 0 && (
        <TierRulesTable tierRules={tier.tier_rules} />
      )}
      {tier?.id && <TierCustomersTable tierId={tier.id} />}
    </div>
  );
};

export default TierDetailsPage;
