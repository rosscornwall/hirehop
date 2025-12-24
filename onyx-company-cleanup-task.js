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

    // =====================================================
    // PLUGIN CODE
    // =====================================================

    // Track companies we've already processed to avoid duplicates
    var processedCompanies = {};

    $(document).ready(function() {
        
        if (typeof user === "undefined" || typeof hh_api_version === "undefined") {
            return;
        }

        console.log('[ONYX] Company cleanup task plugin loaded');

        // Listen for AJAX requests to catch company saves
        $(document).ajaxComplete(function(event, xhr, settings) {
            
            // Check if this was a save.php request (contacts module uses this)
            if (settings.url && settings.url.indexOf('save.php') > -1) {
                
                try {
                    var response = xhr.responseJSON || JSON.parse(xhr.responseText);
                    
                    // Check if response has company data
                    if (response && response.data && response.data.length > 0) {
                        var companyData = response.data[0];
                        
                        // Check if this is a company record with an ID and COMPANY name
                        if (companyData.ID && companyData.COMPANY && companyData.cID) {
                            
                            var companyId = companyData.ID;
                            var companyName = companyData.COMPANY;
                            var uniqueKey = companyId + '_' + companyName;
                            
                            // Only process if we haven't seen this company before in this session
                            // and it looks like a new company (action: 1 typically means insert)
                            if (!processedCompanies[uniqueKey] && response.action === 1) {
                                
                                processedCompanies[uniqueKey] = true;
                                
                                console.log('[ONYX] New company detected: ' + companyName + ' (ID: ' + companyId + ')');
                                createCleanupTask(companyName, companyId);
                            }
                        }
                    }
                } catch (e) {
                    // Silent fail - not a JSON response or parsing error
                    console.log('[ONYX] Parse error:', e);
                }
            }
        });

        function createCleanupTask(companyName, companyId) {
            
            // Calculate dates
            var today = new Date();
            var dueDate = new Date();
            dueDate.setDate(dueDate.getDate() + TASK_DUE_DAYS);
            
            var todayStr = today.toISOString().split('T')[0];
            var dueStr = dueDate.toISOString().split('T')[0];
            var localTime = today.toISOString().split('T')[0] + ' ' + 
                today.toTimeString().split(' ')[0];
            
            // Build task summary
            var taskSummary = TASK_TITLE.replace(/{company}/g, companyName);
            
            console.log('[ONYX] Creating task for company ID:', companyId);
            
            // Create the task using todo_save.php
            $.ajax({
                url: '/php_functions/todo_save.php',
                type: 'POST',
                dataType: 'json',
                data: {
                    id: 0,
                    main_id: companyId,  // Link to company
                    type: 2,             // 2 = Company type
                    summary: taskSummary,
                    dtstart: todayStr,
                    due: dueStr,
                    status: 0,
                    priority: 1,
                    user_id: ASSIGNED_USER_ID,
                    tz: Intl.DateTimeFormat().resolvedOptions().timeZone,
                    local: localTime
                },
                success: function(response) {
                    if (response && response.rows && response.rows.length > 0) {
                        console.log('[ONYX] ✓ Cleanup task created for: ' + companyName);
                        
                        // Try to show notification if available
                        if (typeof warning_message === 'function') {
                            warning_message('Cleanup task created for ' + companyName);
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
