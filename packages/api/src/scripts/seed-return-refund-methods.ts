import {MedusaContainer} from "@medusajs/framework";
import {createSystemConfigWorkflow} from "../workflows/system-config/workflows";

export default async function addReturnRefundMethods(container: MedusaContainer) {
  const returnRefundMethodsConfig = [
    {
      key: 'cod_return',
      value: JSON.stringify([
        { key: "upi", value: "true", label: "UPI" },
        { key: "bank", value: "true", label: "Bank Transfer" }
      ]),
    },
  ];

  const results: any[] = [];
  for (const config of returnRefundMethodsConfig) {
    try {
      const { result: systemConfig } = await createSystemConfigWorkflow(container).run({
        input: config,
      });
      results.push(systemConfig);
      console.log(`✓ Seeded ${config.key}: ${config.value}`);
    } catch (error) {
      console.error(`✗ Failed to seed ${config.key}:`, error);
      // Continue with other configs even if one fails
    }
  }

  console.log(`\n✓ Successfully seeded ${results.length} return-refund methods configuration(s)`);
  return results;
}
