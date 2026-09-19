// frontend/src/templates/TemplateEngine.jsx - MOTEUR DE TEMPLATES DYNAMIQUES
import React, { useState, useEffect } from 'react';
import { servicesAPI } from '../services/api';
import logo from '../assets/logo-ordre-malte.png';

const TemplateEngine = ({ templateConfig, formData, setFormData, pdfContainerRef }) => {
    const [services, setServices] = useState([]);
    const [loadingServices, setLoadingServices] = useState(true);
    const [dynamicData, setDynamicData] = useState({});

    useEffect(() => {
        const fetchDynamicData = async () => {
            try {
                const needsServices = templateConfig.fields?.some(field =>
                    field.dataSource === 'services'
                );
                if (needsServices) {
                    const servicesResponse = await servicesAPI.getAll();
                    setServices(servicesResponse.data.data || []);
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

    const handleChange = (e) => {
        const { name, value, type, checked } = e.target;
        const finalValue = type === 'checkbox' ? checked : value;
        setFormData(prev => ({ ...prev, [name]: finalValue }));
    };

    const handleLineChange = (fieldName, index, subField, value) => {
        setFormData(prev => {
            const newLines = [...(prev[fieldName] || [])];
            if (!newLines[index]) newLines[index] = {};
            newLines[index][subField] = value;
            return { ...prev, [fieldName]: newLines };
        });
    };

    const addLine = (fieldName, defaultLine = {}) => {
        setFormData(prev => ({
            ...prev,
            [fieldName]: [...(prev[fieldName] || []), { ...defaultLine }]
        }));
    };

    const removeLine = (fieldName, index) => {
        setFormData(prev => ({
            ...prev,
            [fieldName]: (prev[fieldName] || []).filter((_, i) => i !== index)
        }));
    };

    const inputStyle = {
        width: '100%', padding: '6px 10px', borderRadius: 'var(--radius-2)',
        border: '1.5px solid var(--border)', background: 'var(--surface)',
        color: 'var(--fg)', fontSize: 13, outline: 'none',
    };

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
            placeholder: field.placeholder,
            required: field.required,
        };

        const staticFieldStyle = {
            borderBottom: '2px dotted #9CA3AF',
            padding: '8px 4px',
            minHeight: '40px',
            fontSize: field.fontSize || '16px',
            fontWeight: '600',
            color: '#000000',
            lineHeight: '1.5',
            display: 'none'
        };

        switch (field.type) {
            case 'text':
                return (
                    <div key={field.name} style={{ marginBottom: 16 }}>
                        <label style={{ fontWeight: 600, display: 'block', marginBottom: 6, fontSize: 13, color: 'var(--fg)' }}>
                            {field.label}
                        </label>
                        <input type="text" {...commonProps} className="not-printable" style={inputStyle} />
                        <div className="print-only" style={staticFieldStyle}>{formData[field.name] || ' '}</div>
                    </div>
                );

            case 'textarea':
                return (
                    <div key={field.name} style={{ marginBottom: 16 }}>
                        <label style={{ fontWeight: 600, display: 'block', marginBottom: 6, fontSize: 13, color: 'var(--fg)' }}>
                            {field.label}
                        </label>
                        <textarea
                            {...commonProps}
                            rows={field.rows || 3}
                            className="not-printable"
                            style={{ ...inputStyle, resize: 'vertical' }}
                        />
                        <div className="print-only" style={staticFieldStyle}>{formData[field.name] || ' '}</div>
                    </div>
                );

            case 'select': {
                let options = [];
                if (field.dataSource === 'services') {
                    options = services.map(service => ({ value: service.name, label: service.name }));
                } else if (field.options) {
                    options = field.options.map(opt =>
                        typeof opt === 'string' ? { value: opt, label: opt } : opt
                    );
                }
                return (
                    <div key={field.name} style={{ marginBottom: 16 }}>
                        <label style={{ fontWeight: 600, display: 'block', marginBottom: 6, fontSize: 13, color: 'var(--fg)' }}>
                            {field.label}
                        </label>
                        <select {...commonProps} className="not-printable" style={inputStyle}>
                            <option value="">-- {field.placeholder || 'Sélectionner'} --</option>
                            {options.map(opt => (
                                <option key={opt.value} value={opt.value}>{opt.label}</option>
                            ))}
                        </select>
                        <div className="print-only" style={staticFieldStyle}>
                            {options.find(opt => opt.value === formData[field.name])?.label || ' '}
                        </div>
                    </div>
                );
            }

            case 'date':
                return (
                    <div key={field.name} style={{ marginBottom: 16 }}>
                        <label style={{ fontWeight: 600, display: 'block', marginBottom: 6, fontSize: 13, color: 'var(--fg)' }}>
                            {field.label}
                        </label>
                        <input type="date" {...commonProps} className="not-printable" style={inputStyle} />
                        <div className="print-only" style={staticFieldStyle}>
                            {formData[field.name] ? new Date(formData[field.name]).toLocaleDateString('fr-FR') : ' '}
                        </div>
                    </div>
                );

            case 'time':
                return (
                    <div key={field.name} style={{ marginBottom: 16 }}>
                        <label style={{ fontWeight: 600, display: 'block', marginBottom: 6, fontSize: 13, color: 'var(--fg)' }}>
                            {field.label}
                        </label>
                        <input type="time" {...commonProps} className="not-printable" style={inputStyle} />
                        <div className="print-only" style={staticFieldStyle}>{formData[field.name] || ' '}</div>
                    </div>
                );

            case 'number':
                return (
                    <div key={field.name} style={{ marginBottom: 16 }}>
                        <label style={{ fontWeight: 600, display: 'block', marginBottom: 6, fontSize: 13, color: 'var(--fg)' }}>
                            {field.label}
                        </label>
                        <input
                            type="number"
                            {...commonProps}
                            min={field.min}
                            max={field.max}
                            className="not-printable"
                            style={inputStyle}
                        />
                        <div className="print-only" style={staticFieldStyle}>{formData[field.name] || ' '}</div>
                    </div>
                );

            case 'checkbox':
                return (
                    <div key={field.name} style={{ marginBottom: 16, display: 'flex', alignItems: 'center', gap: 8 }}>
                        <input
                            type="checkbox"
                            {...commonProps}
                            checked={formData[field.name] || false}
                            style={{ width: 16, height: 16 }}
                        />
                        <label style={{ fontWeight: 600, fontSize: 13, color: 'var(--fg)' }}>{field.label}</label>
                    </div>
                );

            default:
                return null;
        }
    };

    const renderDynamicContent = (content) => {
        if (!content) return '';
        return content.replace(/\{\{([^}]+)\}\}/g, (match, variable) => {
            const trimmedVar = variable.trim();
            if (trimmedVar === 'currentDate') return new Date().toLocaleDateString('fr-FR');
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
            return formData[trimmedVar] || '____________________';
        });
    };

    return (
        <div
            ref={pdfContainerRef}
            style={{
                background: '#ffffff',
                padding: '48px',
                boxShadow: 'var(--shadow-3)',
                margin: '0 auto',
                position: 'relative',
                width: templateConfig.layout?.width || '210mm',
                minHeight: templateConfig.layout?.minHeight || '297mm',
                fontFamily: 'Arial, sans-serif',
                fontSize: '15px',
                color: '#000000'
            }}
        >
            {/* En-tête */}
            <header style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 48 }}>
                {templateConfig.template?.header?.logo && (
                    <img src={logo} alt="Logo" style={{ width: '80px' }} />
                )}
                <h1 style={{ textAlign: 'center', margin: 0 }}>
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

            {/* Champs en-tête */}
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 40 }}>
                {templateConfig.fields
                    ?.filter(field => field.position?.section === 'header')
                    .map(field => (
                        <div key={field.name} style={{ width: field.position.width, textAlign: field.position.align }}>
                            {renderField(field)}
                        </div>
                    ))
                }
            </div>

            {/* Contenu principal */}
            <div style={{ marginBottom: 32 }}>
                {templateConfig.template?.content?.map((section, index) => {
                    switch (section.type) {
                        case 'text':
                            return (
                                <p key={index} style={{ marginBottom: 16, textAlign: section.align, color: '#000000' }}>
                                    {section.content}
                                </p>
                            );
                        case 'section':
                            return (
                                <div key={index} style={{ marginBottom: 24 }}>
                                    <label style={{ fontWeight: 'bold', color: '#000000' }}>{section.title}</label>
                                    {section.field && renderField(
                                        templateConfig.fields?.find(f => f.name === section.field) ||
                                        { name: section.field, type: 'text' }
                                    )}
                                </div>
                            );
                        case 'dynamic':
                            return (
                                <p key={index} style={{ marginBottom: 16, color: '#000000' }}>
                                    {renderDynamicContent(section.content)}
                                </p>
                            );
                        case 'field': {
                            const fieldConfig = templateConfig.fields?.find(f => f.name === section.field);
                            if (fieldConfig) {
                                return (
                                    <div key={index} style={{ marginBottom: 16, fontStyle: section.style === 'italic' ? 'italic' : 'normal' }}>
                                        {renderField(fieldConfig)}
                                    </div>
                                );
                            }
                            return null;
                        }
                        default:
                            return null;
                    }
                })}
            </div>

            {/* Signatures pied de page */}
            {templateConfig.template?.footer?.signatures && (
                <div style={{
                    position: 'absolute', bottom: 96, left: 48, right: 48,
                    display: 'grid', gridTemplateColumns: `repeat(${templateConfig.template.footer.signatures.length}, 1fr)`,
                    gap: 32, textAlign: 'center', color: '#000000'
                }}>
                    {templateConfig.template.footer.signatures.map((signature, index) => (
                        <div key={index}>
                            <p style={{ fontWeight: 600 }}>{signature.label}</p>
                        </div>
                    ))}
                </div>
            )}

            {/* Zone d'édition non imprimée */}
            <div
                className="not-printable"
                style={{
                    margin: '24px 0', padding: 16,
                    background: 'var(--brand-soft)',
                    border: '2px solid var(--brand)',
                    borderRadius: 'var(--radius-3)',
                }}
            >
                {templateConfig.fields
                    ?.filter(field => !field.position || field.position.section !== 'header')
                    .map(renderField)
                }
            </div>
        </div>
    );
};

export default TemplateEngine;
