/**
 * ONYX Systems - HireHop Plugin
 * Auto-create data cleanup task when a new company is added
 * 
 * Installation:
 * 1. Go to: https://github.com/rosscornwall/hirehop
 * 2. Upload this file (or edit the existing one)
 * 3. In HireHop: Settings → Company Settings → Plugins
 * 4. Add: https://rosscornwall.github.io/hirehop/onyx-company-cleanup-task.js
 * 5. Save and refresh HireHop
 */

(function() {
    'use strict';

    // =====================================================
    // CONFIGURATION
    // =====================================================
    
    var ASSIGNED_USER_ID = 1; // Ross Cornwall
    var TASK_DUE_DAYS = 2;
    var TASK_TITLE = "🧹 Data Cleanup: {company}";
    var TASK_DESCRIPTION = "Review and complete company details:\n\n• Address\n• Phone number\n• Email\n• Payment terms\n• VAT number\n• Notes";

    // =====================================================
    // PLUGIN CODE
    // =====================================================

    $(document).ready(function() {
        
        if (typeof user === "undefined" || typeof hh_api_version === "undefined") {
            return;
        }

        console.log('[ONYX] Company cleanup task plugin loaded');

        // Listen for AJAX requests to catch company saves
        $(document).ajaxComplete(function(event, xhr, settings) {
            
            // Check if this was a company save request
            if (settings.url && settings.url.indexOf('company_save.php') > -1) {
                
                try {
                    var response = xhr.responseJSON || JSON.parse(xhr.responseText);
                    
                    // Check if this was a NEW company (response contains the new ID)
                    // and we have the data that was sent
                    if (response && response.id && settings.data) {
                        
                        // Parse the form data to check if it was a new company
                        var formData = settings.data;
                        var wasNew = false;
                        var companyName = '';
                        
                        // Handle both string and object formats
                        if (typeof formData === 'string') {
                            var params = new URLSearchParams(formData);
                            wasNew = params.get('id') === '0' || params.get('id') === '';
                            companyName = params.get('name') || '';
                        } else if (typeof formData === 'object') {
                            wasNew = formData.id === 0 || formData.id === '0' || !formData.id;
                            companyName = formData.name || '';
                        }
                        
                        if (wasNew && companyName) {
                            console.log('[ONYX] New company detected: ' + companyName);
                            createCleanupTask(companyName, response.id);
                        }
                    }
                } catch (e) {
                    // Silent fail - not a JSON response or parsing error
                }
            }
        });

        function createCleanupTask(companyName, companyId) {
            
            // Calculate due date
            var dueDate = new Date();
            dueDate.setDate(dueDate.getDate() + TASK_DUE_DAYS);
            var dueDateStr = dueDate.toISOString().split('T')[0] + ' 09:00:00';
            
            // Build task title and description
            var taskTitle = TASK_TITLE.replace(/{company}/g, companyName);
            var taskDescription = TASK_DESCRIPTION.replace(/{company}/g, companyName);
            
            // Create the task
            $.ajax({
                url: '/php_functions/task_save.php',
                type: 'POST',
                dataType: 'json',
                data: {
                    id: 0,
                    title: taskTitle,
                    description: taskDescription,
                    due_date: dueDateStr,
                    user_id: ASSIGNED_USER_ID,
                    priority: 1,
                    status: 0,
                    company_id: companyId // Link task to the company
                },
                success: function(response) {
                    if (response && !response.error) {
                        console.log('[ONYX] Cleanup task created for: ' + companyName);
                        
                        if (typeof hh_notify === 'function') {
                            hh_notify('Cleanup task created for ' + companyName, 'success');
                        }
                    } else {
                        console.warn('[ONYX] Failed to create task:', response);
                    }
                },
                error: function(xhr, status, error) {
                    console.error('[ONYX] Error creating task:', error);
                }
            });
        }

        console.log('[ONYX] Company save listener active');
    });

})();
