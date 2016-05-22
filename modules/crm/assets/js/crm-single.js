;( function($) {

    var tableColumns = [
        {
            name: 'name',
            title: ( wpErpCrm.contact_type == 'contact') ? 'Contact name' : 'Company name',
            callback: 'fullName',
            sortField: 'id',
        },
        {
            name: 'email',
            title: 'Email Address'

        },
        {
            name: 'phone',
            title: 'Phone'
        },
        {
            name: 'life_stage',
            title: 'Life stage',
            callback: 'lifeStage',
        },

        {
            name: 'contact_owner',
            title: 'Owner',
            callback: 'contactOwner',
        },

        {
            name: 'created',
            title: 'Created At',
            sortField: 'created'
        }
    ];

    var bulkactions = {
        defaultAction: [
            {
                id : 'delete',
                text : 'Delete',
                showIf : 'whenNotTrased'
            },

            {
                id : 'permanent_delete',
                text : 'Permanent Delete',
                showIf : 'onlyTrased'
            },

            {
                id : 'restore',
                text : 'Restore',
                showIf : 'onlyTrased'
            },

            {
                id : 'assign_group',
                text : 'Assign Group',
                showIf : 'whenNotTrased'
            }
        ],
    }

    var extraBulkAction = {
        'filterContactOwner' : {
            name: 'filter_assign_contact',
            type: 'select', // or text|email|number|url|datefield
            id: 'erp-select-user-for-assign-contact',
            class: 'test-class',
            placeholder: 'Select an agent',
            options: [
                {
                    id : '',
                    text: ''
                }
            ]
        }
    }

    var contact = new Vue({
        el: '#wp-erp',
        data : {
            fields: tableColumns,
            itemRowActions: [
                {
                    title: 'Edit',
                    attrTitle: 'Edit this contact',
                    class: 'edit',
                    action: 'edit'
                },
                {
                    title: 'View',
                    attrTitle: 'View this contact',
                    class: 'view',
                    action: 'view',
                },
                {
                    title: 'Delete',
                    attrTitle: 'Delete this contact',
                    class: 'delete',
                    action: 'delete',
                    showIf: 'whenNotTrased'
                },
                {
                    title: 'Permanent Delete',
                    attrTitle: 'Permanent Delete this contact',
                    class: 'delete',
                    action: 'permanent_delete',
                    showIf: 'onlyTrased'
                },
                {
                    title: 'Restore',
                    attrTitle: 'Restore this contact',
                    class: 'restore',
                    action: 'restore',
                    showIf: 'onlyTrased'
                },

            ],
            topNavFilter: {
                data: wpErpCrm.statuses,
                default: 'all',
                field: 'status'
            },
            bulkactions: bulkactions,
            extraBulkAction: extraBulkAction,
            additionalParams: {
                'type' : wpErpCrm.contact_type
            },
            search: {
                params: 's',
                wrapperClass: '',
                screenReaderText: ( wpErpCrm.contact_type == 'company' ) ? 'Search Compnay' : 'Search Contact',
                inputId: 'search-input',
                btnText: ( wpErpCrm.contact_type == 'company' ) ? 'Search Compnay' : 'Search Contact',
                btnId: 'search-submit'
            }
        },

        methods: {
            fullName: function( value, item ) {
                if ( wpErpCrm.contact_type == 'contact' ) {
                    var link  = '<a href="' + item.details_url + '"><strong>' + item.first_name + ' '+ item.last_name + '</strong></a>';
                } else {
                    var link  = '<a href="' + item.details_url + '"><strong>' + item.company + '</strong></a>';
                }
                return item.avatar.img + link;
            },

            lifeStage: function( value, item ) {
                return wpErpCrm.life_stages[value];
            },

            contactOwner: function( value, item ) {
                return ( Object.keys( item.assign_to ).length > 0 ) ? '<a href="#">' + item.assign_to.display_name + '</a>' : '—';
            },

            onlyTrased: function( rowAction ) {
                if ( this.$refs.vtable.currentTopNavFilter == 'trash' ) {
                    return true;
                }
                return false;
            },

            whenNotTrased: function( rowAction ) {
                if ( this.$refs.vtable.currentTopNavFilter != 'trash' ) {
                    return true;
                }
                return false;
            },

            initFields: function() {
                $( '.erp-date-field').datepicker({
                    dateFormat: 'yy-mm-dd',
                    changeMonth: true,
                    changeYear: true,
                    yearRange: '-100:+0',
                });

                $( '.erp-select2' ).select2({
                    placeholder: $(this).attr('data-placeholder')
                });

            },

            addContact: function( type, title ) {
                var self = this;

                $.erpPopup({
                    title: title,
                    button: wpErpCrm.add_submit,
                    id: 'erp-crm-new-contact',
                    content: wperp.template('erp-crm-new-contact')(  wpErpCrm.customer_empty  ).trim(),
                    extraClass: 'midium',
                    onReady: function() {
                        self.initFields();
                    },
                    onSubmit: function(modal) {
                        modal.disableButton();

                        wp.ajax.send( {
                            data: this.serialize(),
                            success: function( res ) {
                                modal.enableButton();
                                modal.closeModal();
                                self.$refs.vtable.tableData.unshift(res.data);
                                self.$refs.vtable.topNavFilter.data = res.statuses;
                            },
                            error: function(error) {
                                modal.enableButton();
                                alert( error );
                            }
                        });
                    }
                });
            },

            editContact: function( data, index ) {
                var self = this;

                $.erpPopup({
                    title: 'Edit this customer',
                    button: wpErpCrm.update_submit,
                    id: 'erp-customer-edit',
                    onReady: function() {
                        var modal = this;
                        $( 'header', modal).after( $('<div class="loader"></div>').show() );
                        wp.ajax.send( 'erp-crm-customer-get', {
                            data: {
                                id: data.id,
                                _wpnonce: wpErpCrm.nonce
                            },
                            success: function( response ) {
                                var html = wp.template('erp-crm-new-contact')( response );
                                $( '.content', modal ).html( html );
                                $( '.loader', modal).remove();

                                $( 'li[data-selected]', modal ).each(function() {
                                    var self = $(this),
                                        selected = self.data('selected');

                                    if ( selected !== '' ) {
                                        self.find( 'select' ).val( selected );
                                    }
                                });

                                $('select#erp-customer-type').trigger('change');
                                $( '.erp-select2' ).select2();
                                $( 'select.erp-country-select').change();

                                $( 'li[data-selected]', modal ).each(function() {
                                    var self = $(this),
                                        selected = self.data('selected');

                                    if ( selected !== '' ) {
                                        self.find( 'select' ).val( selected );
                                    }
                                });

                                _.each( $( 'input[type=checkbox].erp-crm-contact-group-class' ), function( el, i) {
                                    var optionsVal = $(el).val();
                                    if( _.contains( response.group_id, optionsVal ) ) {
                                        $(el).prop('checked', true );
                                    }
                                });

                                self.initFields();
                            }
                        });
                    },
                    onSubmit: function(modal) {
                        modal.disableButton();

                        wp.ajax.send( {
                            data: this.serialize(),
                            success: function(res) {
                                modal.enableButton();
                                modal.closeModal();
                                self.$refs.vtable.tableData.$set( index, res.data );
                                self.$refs.vtable.topNavFilter.data = res.statuses;
                            },
                            error: function(error) {
                                modal.enableButton();
                                alert( error );
                            }
                        });
                    }
                });
            },

            deleteContact: function( data, type, hard, isBulk ) {
                var self = this;

                if ( isBulk ) {
                    self.$refs.vtable.ajaxloader = true;
                }

                if ( confirm( wpErpCrm.delConfirmCustomer ) ) {
                    wp.ajax.send( 'erp-crm-customer-delete', {
                        data: {
                            _wpnonce: wpErpCrm.nonce,
                            id: ( isBulk ) ? data : data.id,
                            hard: ( hard == true ) ? 1 : 0,
                            type: type
                        },
                        success: function(res) {
                            if ( isBulk ) {
                                self.$nextTick(function() {
                                    this.$broadcast('vtable:refresh')
                                });
                                self.$refs.vtable.ajaxloader = false;
                            } else {
                                self.$refs.vtable.tableData.$remove( data );
                            }
                            self.$refs.vtable.topNavFilter.data = res.statuses;
                        },
                        error: function(res) {
                            alert( res );
                        }
                    });
                } else {
                    self.$refs.vtable.ajaxloader = false;
                }
            },

            restoreContact: function( data, type, isBulk ) {
                var self = this;

                if ( isBulk ) {
                    self.$refs.vtable.ajaxloader = true;
                }

                if ( confirm( wpErpCrm.confirm ) ) {
                    wp.ajax.send( 'erp-crm-customer-restore', {
                        data: {
                            _wpnonce: wpErpCrm.nonce,
                            id: ( isBulk ) ? data : data.id,
                            type: type
                        },
                        success: function(res) {
                            if ( isBulk ) {
                                self.$nextTick(function() {
                                    this.$broadcast('vtable:refresh')
                                });
                                self.$refs.vtable.ajaxloader = false;
                            } else {
                                self.$refs.vtable.tableData.$remove( data );
                            }
                            self.$refs.vtable.topNavFilter.data = res.statuses;
                        },
                        error: function(res) {
                            alert( res );
                        }
                    });
                } else {
                    self.$refs.vtable.ajaxloader = false;
                }
            },

            assignContact: function( ids, type ) {
                var self = this;

                if ( ids.length > 0 ) {
                    $.erpPopup({
                        title: wpErpCrm.popup.customer_assing_group,
                        button: wpErpCrm.add_submit,
                        id: 'erp-crm-customer-bulk-assign-group',
                        content: wperp.template('erp-crm-new-bulk-contact-group')({ user_id:ids }).trim(),
                        extraClass: 'smaller',

                        onSubmit: function(modal) {
                            modal.disableButton();

                            wp.ajax.send( {
                                data: this.serialize(),
                                success: function( res ) {
                                    modal.enableButton();
                                    modal.closeModal();
                                    self.$broadcast('vtable:refresh');
                                },
                                error: function(error) {
                                    modal.enableButton();
                                    alert( error );
                                }
                            });
                        }
                    }); //popup

                } else {
                    alert( wpErpCrm.checkedConfirm );
                }
            }
        },

        ready: function() {
            var self = this;

            $( 'select#erp-select-user-for-assign-contact' ).select2({
                allowClear: true,
                placeholder: 'Select an Agent',
                minimumInputLength: 3,
                ajax: {
                    url: wpErpCrm.ajaxurl,
                    dataType: 'json',
                    delay: 250,
                    escapeMarkup: function( m ) {
                        return m;
                    },
                    data: function (params) {
                        return {
                            q: params.term, // search term
                            _wpnonce: wpErpCrm.nonce,
                            action: 'erp-search-crm-user'
                        };
                    },
                    processResults: function ( data, params ) {
                        var terms = [];

                        if ( data) {
                            $.each( data.data, function( id, text ) {
                                terms.push({
                                    id: id,
                                    text: text
                                });
                            });
                        }

                        if ( terms.length ) {
                            return { results: terms };
                        } else {
                            return { results: '' };
                        }
                    },
                    cache: true
                }
            });
        },

        events: {
            'vtable:action': function( action, data, index ) {
                if ( 'edit' == action ) {
                    this.editContact( data, index );
                }

                if ( 'delete' == action ) {
                    this.deleteContact( data, wpErpCrm.contact_type, false, false );
                }

                if ( 'restore' == action ) {
                    this.restoreContact( data, wpErpCrm.contact_type,false );
                }

                if ( 'permanent_delete' == action ) {
                    this.deleteContact( data, wpErpCrm.contact_type, true, false );
                }
            },

            'vtable:default-bulk-action': function( action, ids ) {
                // Handle bulk action when action is something with ID's
                if ( 'delete' === action ) {
                    this.deleteContact( ids, wpErpCrm.contact_type, false, true );
                }

                if ( 'permanent_delete' === action ) {
                    this.deleteContact( ids, wpErpCrm.contact_type, true, true );
                }

                if ( 'restore' === action ) {
                    this.restoreContact( ids, wpErpCrm.contact_type, true );
                }

                if ( 'assign_group' === action ) {
                    this.assignContact( ids, wpErpCrm.contact_type );
                }
            }
        }
    });

})(jQuery)
