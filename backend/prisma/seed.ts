/**
 * Seed script — creates a minimal but realistic dataset for local development.
 * Run with: pnpm db:seed
 */
import { PrismaClient } from '@prisma/client'
import bcrypt from 'bcryptjs'
import { v4 as uuidv4 } from 'uuid'

const prisma = new PrismaClient()

async function main() {
  console.log('🌱 Seeding database...')

  // ── Galleries ──────────────────────────────────────────────────────────────
  const [gallery1, gallery2, gallery3] = await Promise.all([
    prisma.gallery.upsert({
      where: { id: 'gal-001-0000-0000-000000000001' },
      update: {},
      create: {
        id: 'gal-001-0000-0000-000000000001',
        name: 'The Grand Collection',
        address: '120 Fifth Avenue',
        city: 'New York',
        country: 'US',
        timezone: 'America/New_York',
        contactEmail: 'hello@grandcollection.art',
        contactPhone: '+1-212-555-0100',
        brandPrimaryColor: '#1A1A2E',
      },
    }),
    prisma.gallery.upsert({
      where: { id: 'gal-002-0000-0000-000000000002' },
      update: {},
      create: {
        id: 'gal-002-0000-0000-000000000002',
        name: 'West Coast Modern',
        address: '850 Battery Street',
        city: 'San Francisco',
        country: 'US',
        timezone: 'America/Los_Angeles',
        contactEmail: 'info@wcmodern.art',
        contactPhone: '+1-415-555-0200',
        brandPrimaryColor: '#E94560',
      },
    }),
    prisma.gallery.upsert({
      where: { id: 'gal-003-0000-0000-000000000003' },
      update: {},
      create: {
        id: 'gal-003-0000-0000-000000000003',
        name: 'The Austin Studio',
        address: '2200 South Congress Avenue',
        city: 'Austin',
        country: 'US',
        timezone: 'America/Chicago',
        contactEmail: 'art@austinstudio.com',
        brandPrimaryColor: '#16213E',
      },
    }),
  ])
  console.log('✓ Galleries created')

  // ── Staff ──────────────────────────────────────────────────────────────────
  const superAdminHash = await bcrypt.hash('SuperAdmin123!', 12)
  const adminHash = await bcrypt.hash('GalleryAdmin1!', 12)

  await prisma.galleryStaff.upsert({
    where: { email: 'super@perceptron.art' },
    update: {},
    create: {
      email: 'super@perceptron.art',
      passwordHash: superAdminHash,
      role: 'SUPER_ADMIN',
      galleryId: null,
    },
  })

  await prisma.galleryStaff.upsert({
    where: { email: 'admin@grandcollection.art' },
    update: {},
    create: {
      email: 'admin@grandcollection.art',
      passwordHash: adminHash,
      role: 'GALLERY_ADMIN',
      galleryId: gallery1.id,
    },
  })

  await prisma.galleryStaff.upsert({
    where: { email: 'staff@wcmodern.art' },
    update: {},
    create: {
      email: 'staff@wcmodern.art',
      passwordHash: adminHash,
      role: 'GALLERY_STAFF',
      galleryId: gallery2.id,
    },
  })
  console.log('✓ Staff accounts created')

  // ── Artists ────────────────────────────────────────────────────────────────
  const artists = await Promise.all([
    upsertArtist('Elena Voss', 'elena-voss', 'Contemporary abstract painter known for luminous color fields and geometric precision. Her work explores the tension between order and chaos.', 1978, null, 'German'),
    upsertArtist('Marcus Chen', 'marcus-chen', 'Award-winning figurative painter exploring themes of identity and diaspora through a blend of Eastern and Western traditions.', 1985, null, 'American'),
    upsertArtist('Isabelle Fontaine', 'isabelle-fontaine', 'French sculptor and mixed-media artist whose intimate works examine memory, loss, and the passage of time.', 1962, null, 'French'),
    upsertArtist('James Kearney', 'james-kearney', 'Late 20th-century minimalist whose spare canvases defined an era of cool detachment and mathematical beauty.', 1941, 2019, 'British'),
    upsertArtist('Priya Nair', 'priya-nair', 'Multidisciplinary artist merging traditional Indian textile patterns with digital processes to create vibrant, layered compositions.', 1990, null, 'Indian'),
  ])
  console.log('✓ Artists created')

  // ── Paintings ──────────────────────────────────────────────────────────────
  const paintingData = [
    // Elena Voss — Gallery 1 (Grand Collection)
    { gallery: gallery1, artist: artists[0]!, title: 'Resonance in Blue', year: 2022, medium: 'Oil on canvas', w: 120, h: 90, price: '18500', status: 'AVAILABLE', desc: 'A meditative exploration of cobalt gradients that shift with the ambient light of the room. Voss spent six months studying the optical properties of ultramarine before beginning this series.' },
    { gallery: gallery1, artist: artists[0]!, title: 'Fractured Light Study No. 3', year: 2023, medium: 'Acrylic on linen', w: 80, h: 80, price: '12000', status: 'AVAILABLE', desc: 'Part of a series examining refraction patterns through a prism. The geometric shards create a dynamic sense of movement frozen at the moment of impact.' },
    { gallery: gallery1, artist: artists[1]!, title: 'Inherited Landscape', year: 2021, medium: 'Oil on canvas', w: 150, h: 100, price: '24000', status: 'SOLD', desc: 'A dual portrait that blends family photographs with imagined terrain from Chen\'s ancestral province. The work questions how geography shapes identity across generations.' },
    { gallery: gallery1, artist: artists[3]!, title: 'Void Study IX', year: 1998, medium: 'Oil on canvas', w: 200, h: 200, price: null, status: 'ON_LOAN', desc: 'A major late work by Kearney, this monumental canvas features his signature reduction to near-emptiness — a single horizontal band of warm grey against white.' },
    { gallery: gallery1, artist: artists[2]!, title: 'Memory Vessel', year: 2019, medium: 'Bronze, found objects', w: 30, h: 45, price: '8500', status: 'AVAILABLE', desc: 'A cast bronze form containing personal objects donated by gallery visitors. Each casting is unique, preserving the texture of the objects within.' },

    // Marcus Chen — Gallery 1
    { gallery: gallery1, artist: artists[1]!, title: 'The Second Arrival', year: 2020, medium: 'Oil and encaustic on panel', w: 90, h: 120, price: '19500', status: 'AVAILABLE', desc: 'Chen\'s most autobiographical work depicts a figure at a threshold — neither inside nor outside. The encaustic surface catches light differently throughout the day, creating an ever-shifting narrative.' },
    { gallery: gallery1, artist: artists[4]!, title: 'Pattern Recognition Series: I', year: 2023, medium: 'Digital weave on silk', w: 60, h: 90, price: '7500', status: 'AVAILABLE', desc: 'Nair\'s first foray into physical textile work, this piece is digitally woven from algorithms trained on traditional Kantha embroidery patterns.' },

    // Gallery 2 (West Coast Modern)
    { gallery: gallery2, artist: artists[0]!, title: 'Pacific Horizon', year: 2022, medium: 'Oil on canvas', w: 160, h: 80, price: '22000', status: 'AVAILABLE', desc: 'Inspired by the Pacific Coast, Voss creates a panoramic sweep of warm ochres and deep teals that evoke the meeting of land, sea, and sky at dusk.' },
    { gallery: gallery2, artist: artists[4]!, title: 'Mandala Protocol', year: 2022, medium: 'Archival pigment print on aluminum', w: 100, h: 100, price: '9800', status: 'AVAILABLE', desc: 'An algorithmic interpretation of sacred geometry, generated from noise functions and constrained by Fibonacci ratios.' },
    { gallery: gallery2, artist: artists[1]!, title: 'Ghost River', year: 2019, medium: 'Watercolor and ink on paper', w: 70, h: 50, price: '5200', status: 'SOLD', desc: 'A delicate study of water in motion, capturing the quality of light on moving water through layered transparent washes.' },
    { gallery: gallery2, artist: artists[2]!, title: 'The Quiet Hour', year: 2020, medium: 'Cast resin, pressed flowers', w: 40, h: 40, price: '6800', status: 'AVAILABLE', desc: 'A contemplative piece in which dried wildflowers are suspended in layers of optically clear resin, preserved in perpetual bloom.' },
    { gallery: gallery2, artist: artists[3]!, title: 'Composition in Two Parts', year: 1994, medium: 'Oil on canvas, diptych', w: 240, h: 120, price: '45000', status: 'AVAILABLE', desc: 'A major museum-quality diptych from Kearney\'s most celebrated decade. The two panels engage in quiet dialogue across a gap of negative space.' },

    // Gallery 3 (Austin Studio)
    { gallery: gallery3, artist: artists[4]!, title: 'Algorithm of the Sacred', year: 2023, medium: 'Jacquard woven tapestry', w: 120, h: 180, price: '14500', status: 'AVAILABLE', desc: 'Nair\'s largest woven work to date, this tapestry was produced in collaboration with a traditional weaving house in Varanasi using patterns generated by custom neural networks.' },
    { gallery: gallery3, artist: artists[0]!, title: 'Heat Study: Austin', year: 2023, medium: 'Oil on linen', w: 90, h: 90, price: '16000', status: 'AVAILABLE', desc: 'Part of Voss\'s ongoing "Heat Studies" series, responding to the specific quality of Texas summer light. The palette is drawn from infrared photography of the surrounding landscape.' },
    { gallery: gallery3, artist: artists[1]!, title: 'Border Crossing', year: 2018, medium: 'Oil, photo transfer on canvas', w: 130, h: 100, price: '21000', status: 'SOLD', desc: 'A layered work combining photographic transfers of immigration documents with Chen\'s gestural overpainting. A meditation on what papers mean.' },
    { gallery: gallery3, artist: artists[2]!, title: 'Echoes (Set of Four)', year: 2021, medium: 'Terracotta, slip glaze', w: 25, h: 30, price: '12000', status: 'AVAILABLE', desc: 'Four small vessels in Fontaine\'s ongoing series on domestic memory. Each is thrown and carved with marks that reference specific architectural details from her childhood home.' },
    { gallery: gallery3, artist: artists[4]!, title: 'Digital Dhrupad', year: 2022, medium: 'Archival pigment on cotton rag', w: 80, h: 110, price: '8200', status: 'IN_STORAGE', desc: 'Inspired by the ancient North Indian classical music form, this work visualizes frequency and resonance patterns from a live Dhrupad performance.' },
    { gallery: gallery3, artist: artists[3]!, title: 'Early Work (Untitled)', year: 1972, medium: 'Oil on board', w: 45, h: 45, price: '38000', status: 'AVAILABLE', desc: 'A rare early Kearney from his formative period in London, before he fully developed the radical minimalism of his mature work. Shows the seeds of what was to come.' },
    { gallery: gallery3, artist: artists[0]!, title: 'Dusk Field', year: 2020, medium: 'Oil on canvas', w: 100, h: 75, price: '13500', status: 'AVAILABLE', desc: 'A transitional work in Voss\'s practice, moving from her earlier geometric vocabulary toward the atmospheric color studies that would define her 2020s work.' },
    { gallery: gallery3, artist: artists[1]!, title: 'Reflection Study', year: 2022, medium: 'Oil on board', w: 35, h: 45, price: '4800', status: 'AVAILABLE', desc: 'A small, intimate study that captures the fleeting quality of light on water. Painted en plein air at Barton Creek, Austin.' },
  ]

  for (const p of paintingData) {
    await prisma.painting.upsert({
      where: { qrCodeId: generateDeterministicQr(p.title, p.gallery.id) },
      update: {},
      create: {
        galleryId: p.gallery.id,
        artistId: p.artist.id,
        title: p.title,
        year: p.year,
        medium: p.medium,
        widthCm: p.w,
        heightCm: p.h,
        price: p.price ?? null,
        currency: 'USD',
        description: p.desc,
        primaryImage: `paintings/placeholder.jpg`,
        dominantColor: randomHex(),
        status: p.status as 'AVAILABLE' | 'SOLD' | 'ON_LOAN' | 'IN_STORAGE',
        qrCodeId: generateDeterministicQr(p.title, p.gallery.id),
      },
    })
  }
  console.log(`✓ ${paintingData.length} paintings created`)

  // ── Sample users ───────────────────────────────────────────────────────────
  const user1 = await prisma.user.upsert({
    where: { email: 'alice@example.com' },
    update: {},
    create: {
      email: 'alice@example.com',
      authProvider: 'GOOGLE',
      providerUserId: 'google-alice-001',
      displayName: 'Alice Johnson',
      firstGalleryId: gallery1.id,
    },
  })

  const user2 = await prisma.user.upsert({
    where: { email: 'bob@example.com' },
    update: {},
    create: {
      email: 'bob@example.com',
      authProvider: 'APPLE',
      providerUserId: 'apple-bob-001',
      displayName: 'Bob Smith',
      firstGalleryId: gallery2.id,
    },
  })
  console.log('✓ Sample users created')

  // ── Saved paintings ────────────────────────────────────────────────────────
  const allPaintings = await prisma.painting.findMany({ take: 5 })
  for (const painting of allPaintings.slice(0, 3)) {
    await prisma.savedPainting.upsert({
      where: { userId_paintingId: { userId: user1.id, paintingId: painting.id } },
      update: {},
      create: { userId: user1.id, paintingId: painting.id },
    })
  }
  for (const painting of allPaintings.slice(2, 5)) {
    await prisma.savedPainting.upsert({
      where: { userId_paintingId: { userId: user2.id, paintingId: painting.id } },
      update: {},
      create: { userId: user2.id, paintingId: painting.id },
    })
  }
  console.log('✓ Saved paintings created')

  console.log('\n✅ Seed complete!\n')
  console.log('Admin credentials:')
  console.log('  Super admin: super@perceptron.art / SuperAdmin123!')
  console.log('  Gallery admin: admin@grandcollection.art / GalleryAdmin1!')
  console.log('  Gallery staff: staff@wcmodern.art / GalleryAdmin1!\n')
}

async function upsertArtist(
  name: string,
  slug: string,
  bio: string,
  birthYear: number | null,
  deathYear: number | null,
  nationality: string,
) {
  return prisma.artist.upsert({
    where: { slug },
    update: {},
    create: { name, slug, bio, birthYear, deathYear, nationality, portraitImage: null },
  })
}

// Deterministic UUID-like string from title + galleryId so re-runs are idempotent
function generateDeterministicQr(title: string, galleryId: string): string {
  const { createHash } = require('crypto') as typeof import('crypto')
  const hash = createHash('md5').update(`${title}::${galleryId}`).digest('hex')
  return `${hash.slice(0, 8)}-${hash.slice(8, 12)}-4${hash.slice(13, 16)}-${hash.slice(16, 20)}-${hash.slice(20, 32)}`
}

function randomHex() {
  const colors = ['#2C3E50', '#E74C3C', '#3498DB', '#2ECC71', '#F39C12', '#9B59B6', '#1ABC9C', '#E67E22', '#34495E', '#16A085']
  return colors[Math.floor(Math.random() * colors.length)] ?? '#2C3E50'
}

main()
  .catch((e) => {
    console.error(e)
    process.exit(1)
  })
  .finally(() => prisma.$disconnect())
