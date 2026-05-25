import type {
  PaintingStatus,
  AuthProvider,
  GalleryStaffRole,
  ScanMethod,
  VisualizationMode,
  InquiryStatus,
} from './enums'

// ─── Common ───────────────────────────────────────────────────────────────────

export interface PaginationQuery {
  page?: number
  limit?: number
}

export interface PaginatedResponse<T> {
  data: T[]
  total: number
  page: number
  limit: number
  totalPages: number
}

export interface ApiError {
  error: string
  message: string
  statusCode: number
  details?: unknown
}

// ─── Galleries ────────────────────────────────────────────────────────────────

export interface GalleryPublic {
  id: string
  name: string
  address: string
  city: string
  country: string
  timezone: string
  contactEmail: string
  contactPhone: string | null
  brandPrimaryColor: string | null
  brandLogoUrl: string | null
  createdAt: string
}

// ─── Artists ──────────────────────────────────────────────────────────────────

export interface ArtistPublic {
  id: string
  name: string
  slug: string
  bio: string
  birthYear: number | null
  deathYear: number | null
  nationality: string | null
  portraitImageUrl: string | null
}

// ─── Paintings ────────────────────────────────────────────────────────────────

export interface PaintingPublic {
  id: string
  galleryId: string
  title: string
  year: number | null
  medium: string | null
  widthCm: number
  heightCm: number
  depthCm: number | null
  price: string | null
  currency: string
  description: string
  provenance: string | null
  primaryImageUrl: string
  dominantColor: string | null
  status: PaintingStatus
  artist: ArtistPublic
  createdAt: string
  updatedAt: string
}

export interface PaintingListItem {
  id: string
  galleryId: string
  title: string
  year: number | null
  medium: string | null
  widthCm: number
  heightCm: number
  price: string | null
  currency: string
  primaryImageUrl: string
  dominantColor: string | null
  status: PaintingStatus
  artist: Pick<ArtistPublic, 'id' | 'name' | 'slug'>
}

// ─── Users ────────────────────────────────────────────────────────────────────

export interface UserPublic {
  id: string
  email: string | null
  authProvider: AuthProvider
  displayName: string | null
  firstGalleryId: string | null
  createdAt: string
  lastActiveAt: string
}

// ─── Auth ─────────────────────────────────────────────────────────────────────

export interface AuthResponse {
  accessToken: string
  refreshToken: string
  user: UserPublic
}

export interface AdminAuthResponse {
  accessToken: string
  refreshToken: string
  staff: GalleryStaffPublic
}

export interface RefreshTokenRequest {
  refreshToken: string
}

// Request bodies
export interface AppleAuthRequest {
  identityToken: string
  authorizationCode: string
  displayName?: string
}

export interface GoogleAuthRequest {
  idToken: string
  displayName?: string
}

export interface GuestAuthRequest {
  galleryId: string
}

export interface PhoneRequestOtpRequest {
  phoneNumber: string
  galleryId: string
}

export interface PhoneVerifyOtpRequest {
  phoneNumber: string
  code: string
}

export interface AdminLoginRequest {
  email: string
  password: string
}

// ─── Saved Paintings ──────────────────────────────────────────────────────────

export interface SavePaintingRequest {
  paintingId: string
}

// ─── Inquiries ────────────────────────────────────────────────────────────────

export interface CreateInquiryRequest {
  paintingId: string
  galleryId: string
  message: string
  contactEmail: string
  contactPhone?: string
}

export interface InquiryPublic {
  id: string
  paintingId: string
  galleryId: string
  message: string
  contactEmail: string
  contactPhone: string | null
  status: InquiryStatus
  createdAt: string
}

// ─── Analytics ────────────────────────────────────────────────────────────────

export interface LogScanRequest {
  paintingId: string
  galleryId: string
  method: ScanMethod
}

export interface LogVisualizationRequest {
  paintingId: string
  mode: VisualizationMode
  frameStyle?: string
}

// ─── Admin ────────────────────────────────────────────────────────────────────

export interface GalleryStaffPublic {
  id: string
  email: string
  role: GalleryStaffRole
  galleryId: string | null
  createdAt: string
  lastLoginAt: string | null
}

export interface CreateGalleryRequest {
  name: string
  address: string
  city: string
  country: string
  timezone: string
  contactEmail: string
  contactPhone?: string
  brandPrimaryColor?: string
}

export interface UpdateGalleryRequest {
  name?: string
  address?: string
  city?: string
  country?: string
  timezone?: string
  contactEmail?: string
  contactPhone?: string
  brandPrimaryColor?: string
}

export interface CreateArtistRequest {
  name: string
  slug: string
  bio: string
  birthYear?: number
  deathYear?: number
  nationality?: string
}

export interface UpdateArtistRequest {
  name?: string
  slug?: string
  bio?: string
  birthYear?: number | null
  deathYear?: number | null
  nationality?: string | null
}

export interface CreatePaintingRequest {
  galleryId: string
  artistId: string
  title: string
  year?: number
  medium?: string
  widthCm: number
  heightCm: number
  depthCm?: number
  price?: string
  currency?: string
  description: string
  provenance?: string
  dominantColor?: string
  status?: PaintingStatus
}

export interface UpdatePaintingRequest {
  artistId?: string
  title?: string
  year?: number | null
  medium?: string | null
  widthCm?: number
  heightCm?: number
  depthCm?: number | null
  price?: string | null
  currency?: string
  description?: string
  provenance?: string | null
  dominantColor?: string | null
  status?: PaintingStatus
}

export interface CreateStaffRequest {
  email: string
  password: string
  role: GalleryStaffRole
  galleryId?: string
}

export interface UpdateStaffRequest {
  email?: string
  password?: string
  role?: GalleryStaffRole
  galleryId?: string | null
}

export interface UpdateInquiryStatusRequest {
  status: InquiryStatus
}

export interface AnalyticsOverview {
  totalScans: number
  totalVisualizations: number
  totalSavedPaintings: number
  totalInquiries: number
  scansByMethod: { QR: number; COMPUTER_VISION: number }
  visualizationsByMode: { AR: number; PHOTO_UPLOAD: number }
  topPaintings: Array<{ paintingId: string; title: string; scans: number }>
  recentInquiries: InquiryPublic[]
}

// ─── Paintings query params ────────────────────────────────────────────────────

export interface PaintingsQuery extends PaginationQuery {
  galleryId?: string
  artistId?: string
  status?: PaintingStatus
  search?: string
}
