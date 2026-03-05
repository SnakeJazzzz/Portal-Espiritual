# Files to Delete or Gitignore

This document tracks temporary, empty, and unnecessary files in the project.

**Last Updated:** March 5, 2026

---

## Files to Delete

### 1. .DS_Store (macOS System File)
**Location:** `/Users/michaelthemac/Desktop/Projectos/Flores/Pagina/portal-espiritual/.DS_Store`
**Reason:** macOS system file for folder display settings
**Action:** DELETE and ensure .gitignore is working
**Status:** Already in .gitignore, but one exists in root

**Command to delete:**
```bash
rm /Users/michaelthemac/Desktop/Projectos/Flores/Pagina/portal-espiritual/.DS_Store
```

**Prevent future occurrences:**
```bash
# Add to global gitignore (macOS)
echo ".DS_Store" >> ~/.gitignore_global
git config --global core.excludesfile ~/.gitignore_global
```

---

## Empty Placeholder Files (Keep for Now)

These files are intentionally empty as they are placeholders for future phases. **DO NOT DELETE** them yet.

### 1. AboutMe.tsx
**Location:** `/src/components/AboutMe.tsx`
**Size:** 0 bytes
**Purpose:** Placeholder for Phase 4 (About Me Section)
**Action:** Keep - will be implemented in Phase 4
**Status:** Documented in ProjectStatus.md

### 2. Footer.tsx
**Location:** `/src/components/Footer.tsx`
**Size:** 0 bytes
**Purpose:** Placeholder for Phase 5 (Footer component)
**Action:** Keep - will be implemented in Phase 5
**Status:** Documented in ProjectStatus.md

### 3. BookingModal.tsx
**Location:** `/src/components/BookingModal.tsx`
**Size:** 0 bytes
**Purpose:** Placeholder for Phase 5 (Cal.com integration)
**Action:** Keep - will be implemented in Phase 5
**Status:** Documented in ProjectStatus.md

---

## Test Files (Node Modules Only)

All test files found are within `node_modules/` and are part of installed dependencies. These are normal and should **NOT** be deleted:

- `node_modules/*/test.js`
- `node_modules/*/test/*.js`
- `node_modules/*/*.test.ts`

These are automatically excluded by `.gitignore` via the `/node_modules` entry.

---

## Files That Could Be Updated

### 1. README.md
**Location:** `/README.md`
**Current State:** Default Next.js README
**Suggested Action:** Update with project-specific information (optional)
**Priority:** Low
**Notes:** The ProjectStatus.md already contains comprehensive project documentation

---

## Cleanup Commands

Run these commands to clean up unnecessary files:

```bash
# Navigate to project root
cd /Users/michaelthemac/Desktop/Projectos/Flores/Pagina/portal-espiritual

# Remove .DS_Store file
rm .DS_Store

# Find and remove any other .DS_Store files (run periodically)
find . -name ".DS_Store" -type f -delete

# Verify .gitignore is working
git status --ignored
```

---

## .gitignore Analysis

The current `.gitignore` is properly configured and includes:

✅ `/node_modules` - Excludes all dependencies
✅ `/.next/` - Excludes Next.js build output
✅ `/out/` - Excludes static export output
✅ `.DS_Store` - Excludes macOS system files
✅ `*.log*` - Excludes log files
✅ `.env*` - Excludes environment files
✅ `*.tsbuildinfo` - Excludes TypeScript build info

**Recommendation:** .gitignore is complete and comprehensive. No changes needed.

---

## Summary

- **Delete Now:** 1 file (.DS_Store in root)
- **Keep (Placeholders):** 3 files (AboutMe.tsx, Footer.tsx, BookingModal.tsx)
- **Node Modules Test Files:** Ignore (part of dependencies)
- **Optional Update:** README.md (low priority)

**Total Cleanup Impact:** Minimal - project is already clean

---

## Prevention Strategy

To avoid .DS_Store files in the future:

1. **Local gitignore is working** - `.DS_Store` is listed in `.gitignore`
2. **Create global gitignore:**
   ```bash
   echo ".DS_Store" >> ~/.gitignore_global
   git config --global core.excludesfile ~/.gitignore_global
   ```

3. **Prevent creation (macOS):**
   ```bash
   # Prevent .DS_Store on network volumes
   defaults write com.apple.desktopservices DSDontWriteNetworkStores -bool TRUE

   # Prevent .DS_Store on USB drives
   defaults write com.apple.desktopservices DSDontWriteUSBStores -bool TRUE
   ```

---

**Conclusion:** Project is very clean. Only one .DS_Store file needs deletion. All other files are either necessary dependencies or intentional placeholders for future development phases.
