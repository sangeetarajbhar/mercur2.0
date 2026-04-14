import {MedusaContainer} from "@medusajs/framework";
import {createPartnerWorkflow} from "../workflows/partner/workflows";

export default async function createPartner(container: MedusaContainer) {
  const partners = [
    {
      name: 'Unicommerce',
      status: '1',
    },
    {
      name: 'Fynd',
      status: '1',
    }
  ];

  const results: any[] = [];

  for (const partnerData of partners) {
    const { result: partner } = await createPartnerWorkflow(container).run({
      input: partnerData,
    });
    results.push(partner);
  }

  return results;
}
