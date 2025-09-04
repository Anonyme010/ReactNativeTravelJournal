export function formatDate(dateString) {
  const options = { day: "numeric", month: "long", year: "numeric" };
  return new Date(dateString).toLocaleDateString("fr-FR", options);
}

// Fonction pour obtenir toutes les dates uniques d'un tableau de photos
export function getUniqueDates(photos) {
  return [...new Set(photos.map(photo => photo.date))].sort();
}