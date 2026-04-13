import {MedusaContainer} from "@medusajs/framework";
import {createMoengageAlertWorkflow} from "../workflows/moengage-alert/workflows";

export default async function createMoengageAlertStaging(container: MedusaContainer) {
  const moengageAlertData = [
    {
      alert_id: '690dc34c6cbe55f13819baec',
      alert_name: 'login_otp_with_hash_code',
      is_sms: true,
      // sms_attributes: JSON.stringify({
      //   otp_code: "YOUR_otp_code_VAL_HERE",
      //   hash_code: "YOUR_hash_code_VAL_HERE",
      // }),
      is_whatsapp: false,
      is_email: false,
      is_push: false,
      status: '1', // 1-active, 0-inactive
    },
    {
      alert_id: '690dad020d89a3debbd940fe',
      alert_name: 'account_created',
      is_sms: true,
      is_whatsapp: false,
      is_email: false,
      is_push: false,
      status: '1', 
    },
    {
      alert_id: '68dce6dcfe88e1b1aade8086',
      alert_name: 'order_placed',
      is_sms: true,
      is_whatsapp: true,
      is_email: false,
      is_push: false,
      status: '1',
    },

    {
      alert_id: '690dadec5be68535b6d85f14',
      alert_name: 'out_for_delivery',
      is_sms: true,
      is_whatsapp: true,
      is_email: false,
      is_push: true,
      status: '1', 
    },

    {
      alert_id: '690dae5c9a3e1ff50a6b31e1',
      alert_name: 'delivered_successfully',
      is_sms: true,
      is_whatsapp: true,
      is_email: false,
      is_push: true,
      status: '1', 
    },

    {
      alert_id: '690dca15ab64ea29a0147e11',
      alert_name: 'delivery_failed',
      is_sms: true,
      is_whatsapp: true,
      is_email: false,
      is_push: true,
      status: '1', 
    },

    {
      alert_id: '690db4edbb205f58f3a5ccf4',
      alert_name: 'delivery_handover_otp',
      is_sms: true,
      is_whatsapp: false,
      is_email: false,
      is_push: true,
      status: '1', 
    },

    {
      alert_id: '690db5c1f1c5e0926ff27c9f',
      alert_name: 'return_created',
      is_sms: true,
      is_whatsapp: false,
      is_email: false,
      is_push: true,
      status: '1', 
    },

    {
      alert_id: '690db9c54a3fcbe615ff6dad',
      alert_name: 'return_approved',
      is_sms: true,
      is_whatsapp: true,
      is_email: false,
      is_push: true,
      status: '1', 
    },

    {
      alert_id: '690dbca55fe4eb5c3fcc78a2',
      alert_name: 'refund_initiated',
      is_sms: true,
      is_whatsapp: false,
      is_email: false,
      is_push: true,
      status: '1', 
    },

    {
      alert_id: '690dbb81f673206726f64341',
      alert_name: 'refund_approved',
      is_sms: true,
      is_whatsapp: true,
      is_email: false,
      is_push: true,
      status: '1', 
    },
  ];

  const results: any[] = [];
  for (const data of moengageAlertData) {
    const { result: moengageAlert } = await createMoengageAlertWorkflow(container).run({
      input: data,
    });
    results.push(moengageAlert);
  }

  return results;
}
