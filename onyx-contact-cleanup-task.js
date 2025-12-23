/**
 * ONYX Systems - HireHop Plugin
 * Auto-create data cleanup task when a new contact is added
 * 
 * Installation:
 * 1. Host this file on an HTTPS server (e.g., your website, GitHub Pages, or a CDN)
 * 2. In HireHop, go to Settings → Company Settings → Plugins
 * 3. Add the URL to this file (e.g., https://yourdomain.com/plugins/onyx-contact-cleanup-task.js)
 * 4. Save and refresh HireHop
 * 
 * Configuration:
 * - Change ASSIGNED_USER_ID to the user ID who should receive the task
 * - Adjust TASK_DUE_DAYS to change how many days until the task is due
 */

(function() {
    'use strict';

    // =====================================================
    // CONFIGURATION - Edit these values
    // =====================================================
    
    // User ID to assign the cleanup task to
    // To find your user ID: Settings → Users → Select user → look at URL or use API
    // Set to 0 to assign to the user who created the contact
    var ASSIGNED_USER_ID = 0; // 0 = assign to creating user
    
    // How many days from now should the task be due?
    var TASK_DUE_DAYS = 2;
    
    // Task description template
    // Available placeholders: {company}, {name}, {created_by}
    var TASK_DESCRIPTION = "Review and complete contact details for {company}. Ensure all fields are populated: address, phone, email, payment terms, and any relevant notes.";
    
    // Task title template
    var TASK_TITLE = "🧹 Data Cleanup: {company}";

    // =====================================================
    // PLUGIN CODE - Do not edit below unless you know what you're doing
    // =====================================================

    $(document).ready(function() {
        
        // Check we're in a valid HireHop environment
        if (typeof user === "undefined" || typeof hh_api_version === "undefined") {
            return;
        }

        // Check if the contact edit widget exists
        if (typeof $.custom.contact_edit === "undefined") {
            return;
        }

        console.log('[ONYX] Contact cleanup task plugin loaded');

        // Store reference to original widget
        var originalContactEdit = $.custom.contact_edit;

        // Extend the contact_edit widget
        $.widget("custom.contact_edit", $.custom.contact_edit, {
            
            // Override the save function
            _save: function() {
                var self = this;
                var isNewContact = !this.contact_id || this.contact_id === 0;
                
                // Store contact data before save
                var contactCompany = '';
                var contactName = '';
                
                if (this.company && this.company.val) {
                    contactCompany = this.company.val() || '';
                }
                if (this.name && this.name.val) {
                    contactName = this.name.val() || '';
                }
                
                // Call the original save function
                var result = this._super.apply(this, arguments);
                
                // If this is a new contact, create the cleanup task
                if (isNewContact && (contactCompany || contactName)) {
                    // Wait a moment for the save to complete and get the new contact ID
                    setTimeout(function() {
                        self._createCleanupTask(contactCompany, contactName);
                    }, 1500);
                }
                
                return result;
            },
            
            // Create the cleanup task
            _createCleanupTask: function(company, name) {
                var self = this;
                var displayName = company || name || 'New Contact';
                
                // Calculate due date
                var dueDate = new Date();
                dueDate.setDate(dueDate.getDate() + TASK_DUE_DAYS);
                var dueDateStr = dueDate.toISOString().split('T')[0] + ' 09:00:00';
                
                // Build task title and description
                var taskTitle = TASK_TITLE
                    .replace(/{company}/g, displayName)
                    .replace(/{name}/g, name || '')
                    .replace(/{created_by}/g, user.NAME || '');
                    
                var taskDescription = TASK_DESCRIPTION
                    .replace(/{company}/g, displayName)
                    .replace(/{name}/g, name || '')
                    .replace(/{created_by}/g, user.NAME || '');
                
                // Determine who to assign the task to
                var assignToUser = ASSIGNED_USER_ID > 0 ? ASSIGNED_USER_ID : user.ID;
                
                // Create the task via HireHop API
                $.ajax({
                    url: '/php_functions/task_save.php',
                    type: 'POST',
                    dataType: 'json',
                    data: {
                        id: 0, // New task
                        title: taskTitle,
                        description: taskDescription,
                        due_date: dueDateStr,
                        user_id: assignToUser,
                        priority: 1, // Normal priority
                        status: 0 // Open
                    },
                    success: function(response) {
                        if (response && !response.error) {
                            console.log('[ONYX] Cleanup task created successfully for: ' + displayName);
                            
                            // Show a subtle notification (optional)
                            if (typeof hh_notify === 'function') {
                                hh_notify('Task created: Review contact data for ' + displayName, 'success');
                            }
                        } else {
                            console.warn('[ONYX] Failed to create cleanup task:', response);
                        }
                    },
                    error: function(xhr, status, error) {
                        console.error('[ONYX] Error creating cleanup task:', error);
                    }
                });
            }
        });

        console.log('[ONYX] Contact edit widget extended with auto-task creation');
    });

})();
