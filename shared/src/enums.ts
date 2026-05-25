export enum PaintingStatus {
  AVAILABLE = 'AVAILABLE',
  SOLD = 'SOLD',
  ON_LOAN = 'ON_LOAN',
  IN_STORAGE = 'IN_STORAGE',
  ARCHIVED = 'ARCHIVED',
}

export enum AuthProvider {
  APPLE = 'APPLE',
  GOOGLE = 'GOOGLE',
  GUEST = 'GUEST',
  PHONE = 'PHONE',
}

export enum GalleryStaffRole {
  SUPER_ADMIN = 'SUPER_ADMIN',
  GALLERY_ADMIN = 'GALLERY_ADMIN',
  GALLERY_STAFF = 'GALLERY_STAFF',
}

export enum ScanMethod {
  QR = 'QR',
  COMPUTER_VISION = 'COMPUTER_VISION',
}

export enum VisualizationMode {
  AR = 'AR',
  PHOTO_UPLOAD = 'PHOTO_UPLOAD',
}

export enum InquiryStatus {
  NEW = 'NEW',
  CONTACTED = 'CONTACTED',
  CLOSED = 'CLOSED',
}
