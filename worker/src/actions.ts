import { type Json } from './helpers';
import { handleProductActions } from './productActions';
import { handleMasterActions } from './masterActions';

export async function handleAction(
  db: D1Database,
  tenantId: string,
  action: string,
  body: Json
): Promise<unknown> {
  const productResult = await handleProductActions(db, tenantId, action, body);
  if (productResult !== undefined) return productResult;
  return handleMasterActions(db, tenantId, action, body);
}
