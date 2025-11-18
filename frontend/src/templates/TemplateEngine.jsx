// frontend/src/templates/TemplateEngine.jsx - MOTEUR DE TEMPLATES DYNAMIQUES
import React, { useState, useEffect } from 'react';
import { servicesAPI } from '../services/api';
import logo from '../assets/logo-ordre-malte.png';

const TemplateEngine = ({ templateConfig, formData, setFormData, pdfContainerRef }) => {
    const [services, setServices] = useState([]);
    const [loadingServices, setLoadingServices] = useState(true);
    const [dynamicData, setDynamicData] = useState({});

    // Charger les données dynamiques (services, etc.)
    useEffect(() => {
        const fetchDynamicData = async () => {
            try {
                // Charger les services si nécessaire
                const needsServices = templateConfig.fields?.some(field => 
                    field.dataSource === 'services'
                );
                
                if (needsServices) {
                    const servicesResponse = await servicesAPI.getAll();
                    setServices(servicesResponse.data.data || []);
                    
                    // Auto-remplir le service de l'utilisateur si configuré
                    const userServiceResponse = await servicesAPI.getMyService();
                    if (userServiceResponse.data.success && userServiceResponse.data.service) {
                        setFormData(prev => ({
                            ...prev,
                            service: userServiceResponse.data.service.name
                        }));
                    }
                }
            } catch (error) {
                console.error('Erreur chargement données dynamiques:', error);
            } finally {
                setLoadingServices(false);
            }
        };

        fetchDynamicData();
    }, [templateConfig, setFormData]);

    // Gestionnaire de changement de champ
    const handleChange = (e) => {
        const { name, value, type, checked } = e.target;
        const finalValue = type === 'checkbox' ? checked : value;
        
        setFormData(prev => ({ ...prev, [name]: finalValue }));
    };

    // Gestionnaire pour les champs de ligne (tableaux)
    const handleLineChange = (fieldName, index, subField, value) => {
        setFormData(prev => {
            const newLines = [...(prev[fieldName] || [])];
            if (!newLines[index]) newLines[index] = {};
            newLines[index][subField] = value;
            return { ...prev, [fieldName]: newLines };
        });
    };

    // Ajouter une ligne à un champ tableau
    const addLine = (fieldName, defaultLine = {}) => {
        setFormData(prev => ({
            ...prev,
            [fieldName]: [...(prev[fieldName] || []), { ...defaultLine }]
        }));
    };

    // Supprimer une ligne d'un champ tableau
    const removeLine = (fieldName, index) => {
        setFormData(prev => ({
            ...prev,
            [fieldName]: (prev[fieldName] || []).filter((_, i) => i !== index)
        }));
    };

    // Rendu d'un champ individuel
    const renderField = (field) => {
        if (field.conditional) {
            const shouldShow = formData[field.conditional.field] === field.conditional.value;
            if (!shouldShow) return null;
        }

        const commonProps = {
            key: field.name,
            name: field.name,
            value: formData[field.name] || '',
            onChange: handleChange,
            className: `not-printable w-full px-3 py-2 border-2 border-blue-300 dark:border-blue-700 rounded focus:outline-none focus:border-blue-500 dark:bg-dark-surface dark:text-dark-text ${field.className || ''}`,
            placeholder: field.placeholder,
            required: field.required
        };

        // Styles pour le rendu PDF
        const staticFieldStyle = {
            borderBottom: '2px dotted #9CA3AF',
            padding: '8px 4px',
            minHeight: '40px',
            fontSize: field.fontSize || '16px',
            fontWeight: '600',
            color: '#000000',
            lineHeight: '1.5',
            display: 'none' // Caché par défaut, affiché en PDF
        };

        switch (field.type) {
            case 'text':
                return (
                    <div className="mb-4">
                        <label className="font-semibold block mb-2 text-gray-900 dark:text-dark-text">
                            {field.label}
                        </label>
                        <input type="text" {...commonProps} />
                        <div className="print-only" style={staticFieldStyle}>
                            {formData[field.name] || '\u00A0'}
                        </div>
                    </div>
                );

            case 'textarea':
                return (
                    <div className="mb-4">
                        <label className="font-semibold block mb-2 text-gray-900 dark:text-dark-text">
                            {field.label}
                        </label>
                        <textarea 
                            {...commonProps}
                            rows={field.rows || 3}
                            className={`${commonProps.className} resize-vertical`}
                        />
                        <div className="print-only" style={staticFieldStyle}>
                            {formData[field.name] || '\u00A0'}
                        </div>
                    </div>
                );

            case 'select':
                let options = [];
                
                if (field.dataSource === 'services') {
                    options = services.map(service => ({
                        value: service.name,
                        label: service.name
                    }));
                } else if (field.options) {
                    options = field.options.map(opt => 
                        typeof opt === 'string' ? { value: opt, label: opt } : opt
                    );
                }

                return (
                    <div className="mb-4">
                        <label className="font-semibold block mb-2 text-gray-900 dark:text-dark-text">
                            {field.label}
                        </label>
                        <select {...commonProps}>
                            <option value="">-- {field.placeholder || 'Sélectionner'} --</option>
                            {options.map(opt => (
                                <option key={opt.value} value={opt.value}>
                                    {opt.label}
                                </option>
                            ))}
                        </select>
                        <div className="print-only" style={staticFieldStyle}>
                            {options.find(opt => opt.value === formData[field.name])?.label || '\u00A0'}
                        </div>
                    </div>
                );

            case 'date':
                return (
                    <div className="mb-4">
                        <label className="font-semibold block mb-2 text-gray-900 dark:text-dark-text">
                            {field.label}
                        </label>
                        <input type="date" {...commonProps} />
                        <div className="print-only" style={staticFieldStyle}>
                            {formData[field.name] ? new Date(formData[field.name]).toLocaleDateString('fr-FR') : '\u00A0'}
                        </div>
                    </div>
                );

            case 'time':
                return (
                    <div className="mb-4">
                        <label className="font-semibold block mb-2 text-gray-900 dark:text-dark-text">
                            {field.label}
                        </label>
                        <input type="time" {...commonProps} />
                        <div className="print-only" style={staticFieldStyle}>
                            {formData[field.name] || '\u00A0'}
                        </div>
                    </div>
                );

            case 'number':
                return (
                    <div className="mb-4">
                        <label className="font-semibold block mb-2 text-gray-900 dark:text-dark-text">
                            {field.label}
                        </label>
                        <input 
                            type="number" 
                            {...commonProps}
                            min={field.min}
                            max={field.max}
                        />
                        <div className="print-only" style={staticFieldStyle}>
                            {formData[field.name] || '\u00A0'}
                        </div>
                    </div>
                );

            case 'checkbox':
                return (
                    <div className="mb-4 flex items-center">
                        <input 
                            type="checkbox" 
                            {...commonProps}
                            checked={formData[field.name] || false}
                            className="w-4 h-4 mr-2"
                        />
                        <label className="font-semibold text-gray-900 dark:text-dark-text">
                            {field.label}
                        </label>
                    </div>
                );

            default:
                return null;
        }
    };

    // Rendu du contenu dynamique avec variables
    const renderDynamicContent = (content) => {
        if (!content) return '';
        
        return content.replace(/\{\{([^}]+)\}\}/g, (match, variable) => {
            const trimmedVar = variable.trim();
            
            // Variables spéciales
            if (trimmedVar === 'currentDate') {
                return new Date().toLocaleDateString('fr-FR');
            }
            
            if (trimmedVar === 'nombreDeJours' && formData.date_debut && formData.date_fin) {
                const start = new Date(formData.date_debut);
                const end = new Date(formData.date_fin);
                if (start <= end) {
                    const diffTime = Math.abs(end - start);
                    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24)) + 1;
                    return diffDays > 1 ? `${diffDays} jours` : `${diffDays} jour`;
                }
                return '...';
            }
            
            if (trimmedVar.startsWith('formatDate ')) {
                const dateField = trimmedVar.replace('formatDate ', '').trim();
                const dateValue = formData[dateField];
                return dateValue ? new Date(dateValue).toLocaleDateString('fr-FR') : '____________________';
            }
            
            // Variables normales du formData
            return formData[trimmedVar] || '____________________';
        });
    };

    // Rendu du template principal
    return (
        <div 
            ref={pdfContainerRef}
            className="bg-white p-12 shadow-lg mx-auto relative"
            style={{ 
                width: templateConfig.layout?.width || '210mm',
                minHeight: templateConfig.layout?.minHeight || '297mm',
                fontFamily: 'Arial, sans-serif',
                fontSize: '15px',
                color: '#000000'
            }}
        >
            {/* En-tête du document */}
            <header className="flex items-center justify-between mb-12">
                {templateConfig.template?.header?.logo && (
                    <img src={logo} alt="Logo" style={{ width: '80px' }} />
                )}
                <h1 className="text-center">
                    <span style={{ fontSize: '20px', fontWeight: 'bold', display: 'block', color: '#000000' }}>
                        {templateConfig.template?.header?.title || 'ORDRE DE MALTE'}
                    </span>
                    {templateConfig.template?.header?.subtitle && (
                        <span style={{ fontSize: '18px', color: '#DC2626' }}>
                            {templateConfig.template.header.subtitle}
                        </span>
                    )}
                </h1>
            </header>

            {/* Section des champs d'en-tête */}
            <div className="flex justify-between mb-10">
                {templateConfig.fields
                    ?.filter(field => field.position?.section === 'header')
                    .map(field => (
                        <div key={field.name} style={{ width: field.position.width, textAlign: field.position.align }}>
                            {renderField(field)}
                        </div>
                    ))
                }
            </div>

            {/* Contenu principal du template */}
            <div className="mb-8">
                {templateConfig.template?.content?.map((section, index) => {
                    switch (section.type) {
                        case 'text':
                            return (
                                <p 
                                    key={index}
                                    className="mb-4"
                                    style={{ 
                                        textAlign: section.align,
                                        color: '#000000'
                                    }}
                                >
                                    {section.content}
                                </p>
                            );

                        case 'section':
                            return (
                                <div key={index} className="mb-6">
                                    <label className="font-bold text-gray-900 dark:text-dark-text" style={{ color: '#000000' }}>
                                        {section.title}
                                    </label>
                                    {section.field && renderField(
                                        templateConfig.fields?.find(f => f.name === section.field) || 
                                        { name: section.field, type: 'text' }
                                    )}
                                </div>
                            );

                        case 'dynamic':
                            return (
                                <p key={index} className="mb-4" style={{ color: '#000000' }}>
                                    {renderDynamicContent(section.content)}
                                </p>
                            );

                        case 'field':
                            const fieldConfig = templateConfig.fields?.find(f => f.name === section.field);
                            if (fieldConfig) {
                                return (
                                    <div key={index} className={`mb-4 ${section.style === 'italic' ? 'italic' : ''}`}>
                                        {renderField(fieldConfig)}
                                    </div>
                                );
                            }
                            return null;

                        default:
                            return null;
                    }
                })}
            </div>

            {/* Pied de page avec signatures */}
            {templateConfig.template?.footer?.signatures && (
                <div className="absolute bottom-24 left-12 right-12 grid grid-cols-3 gap-8 text-center" style={{ color: '#000000' }}>
                    {templateConfig.template.footer.signatures.map((signature, index) => (
                        <div key={index}>
                            <p className="font-semibold">{signature.label}</p>
                        </div>
                    ))}
                </div>
            )}

            {/* Zone d'édition des champs non-positionnés */}
            <div className="not-printable my-6 p-4 bg-blue-50 dark:bg-blue-900/10 border-2 border-blue-200 dark:border-blue-700 rounded">
                {templateConfig.fields
                    ?.filter(field => !field.position || field.position.section !== 'header')
                    .map(renderField)
                }
            </div>
        </div>
    );
};

export default TemplateEngine;