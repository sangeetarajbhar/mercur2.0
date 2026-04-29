import { Container, Heading, Text, Badge } from "@medusajs/ui";

import { Tier } from "../types";

type TierDetailsSectionProps = {
  tier: Tier;
};

export const TierDetailsSection = ({ tier }: TierDetailsSectionProps) => {
  return (
    <Container className="divide-y p-0">
      <div className="px-6 py-4">
        <Heading level="h2">Tier Information</Heading>
      </div>
      <div className="px-6 py-4 space-y-4">
        <div>
          <Text className="text-ui-fg-subtle text-small-regular mb-1">
            Name
          </Text>
          <Text>{tier.name}</Text>
        </div>
        {tier.promotion && (
          <div>
            <Text className="text-ui-fg-subtle text-small-regular mb-1">
              Promotion
            </Text>
            <div className="flex items-center gap-2">
              <Badge
                color={tier.promotion.status === "active" ? "green" : "grey"}
              >
                {tier.promotion.code}
              </Badge>
              <Text className="text-xs text-ui-fg-muted">
                {tier.promotion.status}
              </Text>
            </div>
          </div>
        )}
      </div>
    </Container>
  );
};
