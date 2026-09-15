/** @type {import('next').NextConfig} */
module.exports = {
  // Browser checks use a separate build so an open development server stays intact.
  distDir: process.env.NEXT_DIST_DIR || '.next',
};
