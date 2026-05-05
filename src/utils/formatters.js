export const formatCurrency = (amount) =>
  `₱${Number(amount).toLocaleString("en-PH", { minimumFractionDigits: 2 })}`;

export const formatDate = (timestamp) =>
  new Date(timestamp).toLocaleDateString("en-PH", {
    year: "numeric", month: "short", day: "numeric",
  });

export const formatTime = (timestamp) =>
  new Date(timestamp).toLocaleTimeString("en-PH", {
    hour: "2-digit", minute: "2-digit",
  });