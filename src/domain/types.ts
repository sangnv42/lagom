// Domain types for the reconstruction. Field shapes follow docs/reference/engineering/02-data-and-assets.md,
// adapted to the observed catalog shape in docs/reference/captures/data.json (evidence below).

export type MoneyVnd = number; // integer >= 0

export type Evidence = {
  sourceUrl?: string;
  verifiedAt?: string;
  isFixture: boolean;
};

export type ProductVariant = {
  id: string;
  label: string; // e.g. "Vừa", "To", "Tiêu chuẩn"
  priceVnd: MoneyVnd; // 0 means "no price yet" -> quote ("Liên hệ"), per observed reference behavior
  compareAtVnd: MoneyVnd | null;
};

export type Product = {
  id: string; // == slug (observed: handle is the identity)
  slug: string;
  sku: string; // e.g. "A0302"; can be '' when the title carries no code
  title: string; // display name (possibly corrected by text-fixes.json)
  description: string;
  collectionSlugs: string[];
  flowerType: string; // e.g. "Hoa bó"
  tags: string[];
  imagePaths: string[]; // reference-site paths (/archflowers-export/... or /img/...)
  variants: ProductVariant[];
  /** catalog order index from the observed export (owner curation order) */
  order: number;
  evidence: Evidence;
};

export type Collection = {
  slug: string;
  title: string;
  virtual?: boolean;
};

export type ContentBlock = { type: 'paragraph' | 'heading' | 'list'; text?: string; items?: string[] };

export type CartLineConfiguration = {
  deliveryDate?: string; // YYYY-MM-DD Vietnam local date
  slot?: string; // e.g. "08:00 – 11:00"
  message?: string; // gift card text
  recipient?: string;
  address?: string;
  district?: string;
};

export type CartLine = {
  productId: string;
  variantLabel: string;
  quantity: number;
  configuration: CartLineConfiguration;
};

export type Buyer = { name: string; phone: string; note: string };

export type CatalogFilters = {
  collection?: string;
  type?: string;
  bandId?: string;
  sort: 'featured' | 'new' | 'asc' | 'desc' | 'off';
  shown?: number;
};

export type CatalogResult = {
  products: Product[];
  totalMatching: number;
  hasMore: boolean;
};

export type ShippingQuote = { status: 'unknown'; amountVnd: null } | { status: 'quoted'; amountVnd: number; quoteId: string };

export type OrderResult =
  | { status: 'handoff-ready'; message: string } // contact adapter: content prepared, nothing submitted
  | { status: 'pending-confirmation'; orderId: string } // real/demo API adapter acknowledgment
  | { status: 'failed'; reason: string };
