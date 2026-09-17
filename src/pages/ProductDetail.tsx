import { useEffect, useMemo, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import {
  ArrowLeft,
  Pencil,
  Trash2,
  Package,
  MapPin,
  Printer,
} from 'lucide-react';
import { useProduct } from '../hooks/useProducts';
import { deleteProduct, getMovements, adjustStock } from '../store/inventoryStore';
import {
  getAssignedLocationsForProduct,
} from '../store/mastersStore';
import { getLocationsCached } from '../store/mastersStore';
import { getFifoLocationsForProduct } from '../store/stockBatchStore';
import { QRPrintModal } from '../components/qr/QRPrintModal';
import { buildProductQRPayload, payloadToJson } from '../lib/qrPayload';
import { toast } from '../components/ui/Toast';
import type { Product, StockMovement } from '../types/inventory';

// NOTE: This is a temporary minimal restore if full file fails — will be replaced
export function ProductDetail() {
  return <div className="p-4">Product detail loading… If you see this, restore ProductDetail.tsx from RESTORE_ProductDetail.tsx in the project artifacts.</div>;
}
