/**
 * French labels for ERP statuses / enums — ported from `web app/src/lib/erp/labels.ts`.
 */

export const statusLabels: Record<string, string> = {
  active: 'Actif', completed: 'Terminé', paid: 'Payé', available: 'Disponible', received: 'Reçu', confirmed: 'Confirmé', accepted: 'Accepté',
  pending: 'En attente', scheduled: 'Planifié', in_progress: 'En cours', partially_paid: 'Payé partiellement', partially_received: 'Partiellement reçu',
  overdue: 'En retard', cancelled: 'Annulé', no_show: 'Absent', expired: 'Expiré', damaged: 'Endommagé', lost: 'Perdu',
  draft: 'Brouillon', inactive: 'Inactif', retired: 'Retiré',
  partially_returned: 'Partiellement retourné', assigned: 'Assigné', ordered: 'Commandé', on_call: 'De garde', normal: 'Normal', sent: 'Envoyé',
  urgent: 'Urgent', high: 'Haute', rented: 'Loué', issued: 'Émis', returned: 'Retourné',
  unpaid: 'Impayé', in_repair: 'En réparation', rejected: 'Refusé', reserved: 'Réservé',
};

export const badgeColor: Record<string, string> = {
  active: 'green', completed: 'green', paid: 'green', available: 'green', received: 'green', confirmed: 'green', accepted: 'green',
  pending: 'yellow', scheduled: 'yellow', in_progress: 'yellow', partially_paid: 'yellow', partially_received: 'yellow', unpaid: 'yellow', in_repair: 'yellow',
  overdue: 'red', cancelled: 'red', no_show: 'red', expired: 'red', damaged: 'red', lost: 'red', rejected: 'red',
  draft: 'gray', inactive: 'gray', retired: 'gray',
  partially_returned: 'orange', assigned: 'orange', ordered: 'orange', reserved: 'orange',
  on_call: 'blue', normal: 'blue', sent: 'blue', issued: 'blue',
  urgent: 'purple', high: 'purple', rented: 'purple',
};

export const movementTypeLabels: Record<string, string> = {
  purchase: 'Achat', sale: 'Vente', rental_out: 'Location sortie', rental_return: 'Retour location', care_usage: 'Utilisation soins',
  transfer_in: 'Transfert entrant', transfer_out: 'Transfert sortant', damaged: 'Endommagé', expired: 'Périmé',
  adjustment_in: 'Ajustement', adjustment_out: 'Ajustement', customer_return: 'Retour client',
};

export const paymentMethodLabels: Record<string, string> = { cash: 'Espèces', bank_transfer: 'Virement', card: 'Carte', cheque: 'Chèque', online: 'En ligne', other: 'Autre' };
export const paymentMethods: string[] = ['cash', 'bank_transfer', 'card', 'cheque', 'online', 'other'];

export const locationTypeLabels: Record<string, string> = { warehouse: 'Entrepôt', storage_room: 'Salle de stockage', vehicle: 'Véhicule', clinic: 'Clinique', office: 'Bureau', other: 'Autre' };

export const trackingTypeLabels: Record<string, string> = { quantity: 'Quantité', batch: 'Lot', serialized: 'Sérialisé' };

export const customerTypeLabels: Record<string, string> = { individual: 'Particulier', company: 'Entreprise', clinic: 'Clinique', organization: 'Organisation', other: 'Autre' };

export const conditionLabels: Record<string, string> = { new: 'Neuf', good: 'Bon', fair: 'Correct', poor: 'Mauvais', damaged: 'Endommagé' };

export const priorityLabels: Record<string, string> = { low: 'Basse', normal: 'Normale', high: 'Haute', urgent: 'Urgente' };

export const scheduleTypeLabels: Record<string, string> = { work: 'Travail', leave: 'Congé', absence: 'Absence', on_call: 'De garde' };
