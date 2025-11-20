@router.get("/pacientes/{id_paciente}/analisis-emocional-avanzado")
def obtener_analisis_emocional_avanzado(
    id_paciente: int,
    dias: int = 30,
    current_user: models.Usuario = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """
    Obtiene análisis emocional avanzado del paciente para el psicólogo
    """
    # Verificar que sea psicólogo
    if current_user.rol != models.UserRole.PSICOLOGO:
        raise HTTPException(status_code=403, detail="Solo psicólogos pueden acceder")
    
    # Verificar que el paciente está asignado
    asignacion = db.query(models.PacientePsicologo).filter(
        models.PacientePsicologo.id_paciente == id_paciente,
        models.PacientePsicologo.id_psicologo == current_user.id_usuario,
        models.PacientePsicologo.activo == True
    ).first()
    
    if not asignacion:
        raise HTTPException(status_code=403, detail="Paciente no asignado")
    
    # Obtener registros emocionales de PostgreSQL
    fecha_inicio = datetime.utcnow() - timedelta(days=dias)
    
    registros = db.query(models.RegistroEmocional).filter(
        models.RegistroEmocional.id_paciente == id_paciente,
        models.RegistroEmocional.fecha_registro >= fecha_inicio
    ).order_by(models.RegistroEmocional.fecha_registro.asc()).all()
    
    # Obtener datos de MongoDB (chat)
    try:
        mongo_db = get_database()
        
        # Análisis emocional del chat
        chat_emotions = list(mongo_db.chat_messages.find({
            "user_id": str(id_paciente),
            "is_bot": False,
            "timestamp": {"$gte": fecha_inicio},
            "emotional_analysis": {"$exists": True}
        }).sort("timestamp", 1))
        
    except Exception as e:
        print(f"Error obteniendo datos de MongoDB: {e}")
        chat_emotions = []
    
    # Procesar datos para gráficos
    emociones_diarias = {}
    emociones_chat = {}
    nivel_riesgo_diario = {}
    
    # Procesar registros manuales
    for registro in registros:
        fecha_str = registro.fecha_registro.strftime('%Y-%m-%d')
        
        if fecha_str not in emociones_diarias:
            emociones_diarias[fecha_str] = {
                'alegria': 0, 'tristeza': 0, 'ansiedad': 0, 
                'enojo': 0, 'miedo': 0, 'neutral': 0,
                'count': 0
            }
        
        emocion = registro.emocion_principal.lower()
        if emocion in emociones_diarias[fecha_str]:
            emociones_diarias[fecha_str][emocion] += registro.intensidad
            emociones_diarias[fecha_str]['count'] += 1
    
    # Promediar intensidades
    for fecha in emociones_diarias:
        count = emociones_diarias[fecha]['count']
        if count > 0:
            for emocion in ['alegria', 'tristeza', 'ansiedad', 'enojo', 'miedo', 'neutral']:
                emociones_diarias[fecha][emocion] = round(
                    emociones_diarias[fecha][emocion] / count, 2
                )
    
    # Procesar emociones del chat
    for msg in chat_emotions:
        fecha_str = msg['timestamp'].strftime('%Y-%m-%d')
        
        if fecha_str not in emociones_chat:
            emociones_chat[fecha_str] = {
                'alegria': 0, 'tristeza': 0, 'ansiedad': 0,
                'enojo': 0, 'miedo': 0, 'neutral': 0,
                'count': 0, 'riesgo_total': 0
            }
        
        analysis = msg.get('emotional_analysis', {})
        emotions = analysis.get('emotions', {})
        
        # Emoción dominante
        emocion = emotions.get('dominant_emotion', 'neutral').lower()
        scores = emotions.get('scores', {})
        
        # Intensidad de la emoción
        intensidad = scores.get(emocion, 0) * 10  # Normalizar a escala 1-10
        
        if emocion in emociones_chat[fecha_str]:
            emociones_chat[fecha_str][emocion] += intensidad
            emociones_chat[fecha_str]['count'] += 1
        
        # Nivel de riesgo
        risk_score = analysis.get('risk_assessment', {}).get('score', 0)
        emociones_chat[fecha_str]['riesgo_total'] += risk_score
    
    # Promediar chat
    for fecha in emociones_chat:
        count = emociones_chat[fecha]['count']
        if count > 0:
            for emocion in ['alegria', 'tristeza', 'ansiedad', 'enojo', 'miedo', 'neutral']:
                emociones_chat[fecha][emocion] = round(
                    emociones_chat[fecha][emocion] / count, 2
                )
            emociones_chat[fecha]['riesgo_promedio'] = round(
                emociones_chat[fecha]['riesgo_total'] / count, 2
            )
    
    # Comparación registro manual vs chat
    comparacion = []
    todas_fechas = sorted(set(list(emociones_diarias.keys()) + list(emociones_chat.keys())))
    
    for fecha in todas_fechas:
        manual = emociones_diarias.get(fecha, {})
        chat = emociones_chat.get(fecha, {})
        
        comparacion.append({
            'fecha': fecha,
            'manual': {
                'alegria': manual.get('alegria', 0),
                'tristeza': manual.get('tristeza', 0),
                'ansiedad': manual.get('ansiedad', 0),
            },
            'chat': {
                'alegria': chat.get('alegria', 0),
                'tristeza': chat.get('tristeza', 0),
                'ansiedad': chat.get('ansiedad', 0),
            },
            'nivel_riesgo': chat.get('riesgo_promedio', 0)
        })
    
    # Estadísticas generales
    total_registros_manuales = len(registros)
    total_mensajes_chat = len(chat_emotions)
    
    # Emoción más frecuente
    conteo_emociones = {}
    for registro in registros:
        emocion = registro.emocion_principal
        conteo_emociones[emocion] = conteo_emociones.get(emocion, 0) + 1
    
    emocion_dominante = max(conteo_emociones.items(), key=lambda x: x[1])[0] if conteo_emociones else "neutral"
    
    # Tendencia (mejorando/empeorando)
    if len(comparacion) >= 7:
        ultimos_7_dias = comparacion[-7:]
        primeros_7_dias = comparacion[:7] if len(comparacion) >= 14 else comparacion[:len(comparacion)//2]
        
        promedio_reciente = sum(d['manual'].get('tristeza', 0) + d['manual'].get('ansiedad', 0) for d in ultimos_7_dias) / len(ultimos_7_dias)
        promedio_anterior = sum(d['manual'].get('tristeza', 0) + d['manual'].get('ansiedad', 0) for d in primeros_7_dias) / len(primeros_7_dias)
        
        if promedio_reciente < promedio_anterior * 0.8:
            tendencia = "mejorando"
        elif promedio_reciente > promedio_anterior * 1.2:
            tendencia = "empeorando"
        else:
            tendencia = "estable"
    else:
        tendencia = "datos_insuficientes"
    
    return {
        "comparacion_diaria": comparacion,
        "estadisticas": {
            "total_registros_manuales": total_registros_manuales,
            "total_mensajes_chat": total_mensajes_chat,
            "emocion_dominante": emocion_dominante,
            "tendencia": tendencia,
            "dias_analizados": dias
        },
        "emociones_mas_frecuentes": [
            {"emocion": k, "cantidad": v}
            for k, v in sorted(conteo_emociones.items(), key=lambda x: x[1], reverse=True)
        ]
    }