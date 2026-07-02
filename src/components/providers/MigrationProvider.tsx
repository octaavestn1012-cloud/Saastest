"use client";

import { useEffect } from "react";

export function MigrationProvider({ children }: { children: React.ReactNode }) {
  useEffect(() => {
    // Flag to ensure migration runs only once
    const hasMigrated = localStorage.getItem('reparto_migration_v1');
    if (hasMigrated) return;

    try {
      const savedRules = localStorage.getItem('reparto_rules');
      if (!savedRules) {
        // No rules to migrate
        localStorage.setItem('reparto_migration_v1', 'true');
        return;
      }

      const rules = JSON.parse(savedRules);
      let existingContacts: any[] = [];
      const savedContacts = localStorage.getItem('reparto_recipients');
      if (savedContacts) {
        existingContacts = JSON.parse(savedContacts);
      }

      let contactsChanged = false;
      let rulesChanged = false;

      // Map phone numbers to unique contact IDs to avoid duplicates
      const phoneToContactId: Record<string, string> = {};
      existingContacts.forEach(contact => {
        if (contact.phone) {
          phoneToContactId[contact.phone] = contact.id;
        }
      });

      const updatedRules = rules.map((rule: any) => {
        let ruleNeedsUpdate = false;
        
        const updatedRecipients = (rule.recipients || []).map((recipient: any) => {
          // If the recipient already has an ID reference and no embedded phone/network, skip
          if (recipient.recipientId) return recipient;

          // We found an old recipient embedded in the rule
          ruleNeedsUpdate = true;
          const phone = recipient.phone || "00000000";
          
          let contactId = phoneToContactId[phone];
          
          // If contact doesn't exist, create it
          if (!contactId) {
            contactId = Math.random().toString(36).substring(2, 9);
            const newContact = {
              id: contactId,
              name: recipient.name || `Destinataire ${phone}`,
              network: recipient.network || "Inconnu",
              phone: phone
            };
            existingContacts.push(newContact);
            phoneToContactId[phone] = contactId;
            contactsChanged = true;
          }

          // Return new recipient format
          return {
            id: recipient.id,
            recipientId: contactId,
            value: recipient.value
          };
        });

        if (ruleNeedsUpdate) {
          rulesChanged = true;
          return { ...rule, recipients: updatedRecipients };
        }
        return rule;
      });

      if (contactsChanged) {
        localStorage.setItem('reparto_recipients', JSON.stringify(existingContacts));
      }
      
      if (rulesChanged) {
        localStorage.setItem('reparto_rules', JSON.stringify(updatedRules));
      }

      // Mark migration as done
      localStorage.setItem('reparto_migration_v1', 'true');
      console.log('Migration to recipient book completed.');
      
    } catch (e) {
      console.error('Migration failed:', e);
    }
  }, []);

  return <>{children}</>;
}
