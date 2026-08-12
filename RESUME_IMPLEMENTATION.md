# Resume Preview & Download Implementation

## Overview
Resume viewing and downloading functionality has been implemented for the admin/recruiter panel. The feature enables recruiters to view PDFs inline and download any supported resume format (PDF, DOC, DOCX).

## Files Changed

### Backend Changes

#### 1. `app/routers/jobs.py`
**Changes:**
- Added import statements for `Path`, `HTTPException`, and `FileResponse`
- Added `get_mime_type()` helper function to determine correct Content-Type headers based on file extension
- Added two new endpoints:
  - `GET /jobs/{job_id}/applications/{application_id}/resume/view` - Returns file with inline Content-Disposition for browser preview
  - `GET /jobs/{job_id}/applications/{application_id}/resume/download` - Returns file as attachment with proper filename

**Security:**
- Both endpoints require `require_recruiter` authentication (admin/recruiter roles only)
- Endpoints verify the application exists and belongs to the specified job
- File existence is checked before serving

**Error Handling:**
- Returns 404 if application not found
- Returns 404 if resume file missing/corrupted

### Frontend Changes

#### 1. `frontend/src/api/applications.ts`
**Changes:**
- Added `getResumeViewUrl()` function to generate the view endpoint URL
- Added `getResumeDownloadUrl()` function to generate the download endpoint URL
- Both functions construct URLs using the existing API client base URL, ensuring proper authentication headers

#### 2. `frontend/src/pages/ApplicantDetailsPage.tsx`
**Changes:**
- Added `resumeError` state for error messages
- Added `handleViewResume()` function:
  - Checks file extension from resume_filename
  - For PDFs: Opens in new tab using window.open()
  - For DOC/DOCX: Shows error message "Preview unavailable for this file type. Please download instead."
- Added `handleDownloadResume()` function:
  - Creates a temporary anchor element
  - Triggers file download with proper filename
  - Cleans up DOM after download
- Updated Resume section UI:
  - Removed "reserved for next implementation phase" placeholder text
  - Enabled both "View resume" and "Download resume" buttons (removed disabled state)
  - Added error message display for preview unavailability

## Resume Storage Location

**Path:** `uploads/resumes/`

**Details:**
- Resumes are stored in the local filesystem under the `uploads/resumes/` directory
- Each resume is stored with a UUID-based filename (e.g., `a1b2c3d4e5f6g7h8i9.pdf`)
- Original filename is preserved in the database (`Application.resume_filename`)
- Full path is stored in the database (`Application.resume_path`)
- Allowed formats: `.pdf`, `.doc`, `.docx`

**Database Fields:**
- `Application.resume_filename` - Original filename uploaded by candidate
- `Application.resume_path` - Full filesystem path to stored file

## Feature Behavior

### View Resume
1. User clicks "View resume" button
2. System checks file extension
3. **If PDF:** Opens in new browser tab for inline preview
4. **If DOC/DOCX:** Shows error message, user must download to view
5. **If file missing:** Backend returns 404 error (handled gracefully)

### Download Resume
1. User clicks "Download resume" button
2. Browser downloads file with original filename preserved
3. **If file missing:** Backend returns 404 error (handled gracefully)

## Security Considerations

- All endpoints require authenticated recruiter/admin role
- File path is never exposed to client; only served through controlled endpoints
- Application/job ownership is verified before serving files
- Only authenticated recruiters can access resume files

## Troubleshooting

**If a candidate's resume goes missing:**
1. Check `c:\Users\dnikh\Desktop\HireStack\uploads\resumes\` directory
2. Verify the path stored in the database matches the actual file location
3. Check database record: `SELECT id, resume_filename, resume_path FROM applications WHERE id=<application_id>;`

## Testing Checklist

- [x] PDF files can be viewed inline in browser
- [x] DOC/DOCX files show "Preview unavailable" message
- [x] Download works for all file types
- [x] Original filename is preserved on download
- [x] Buttons are enabled (no longer disabled)
- [x] Placeholder text is removed
- [x] Missing files return appropriate errors
- [x] Only recruiters/admins can access resume endpoints
