import 'dart:async';

import 'package:flutter/material.dart';

import '../../core/services/location_picker_service.dart';

/// Address search field with autocomplete. User types, selects from suggestions,
/// and lat/lng are filled automatically.
class AddressSearchField extends StatefulWidget {
  const AddressSearchField({
    super.key,
    required this.addressController,
    required this.latController,
    required this.lngController,
    this.labelText = 'Endereço',
    this.hintText = 'Digite a rua, bairro ou endereço',
    this.validator,
    this.onAddressSelected,
  });

  final TextEditingController addressController;
  final TextEditingController latController;
  final TextEditingController lngController;
  final String labelText;
  final String hintText;
  final String? Function(String?)? validator;
  /// Called when user selects an address. Use to e.g. derive shortLocation.
  final void Function(String fullAddress)? onAddressSelected;

  @override
  State<AddressSearchField> createState() => _AddressSearchFieldState();
}

class _AddressSearchFieldState extends State<AddressSearchField> {
  final LocationPickerService _service = LocationPickerService();
  final LayerLink _layerLink = LayerLink();
  OverlayEntry? _overlayEntry;
  List<LocationResult> _suggestions = [];
  bool _isSearching = false;
  Timer? _debounce;
  final FocusNode _focusNode = FocusNode();

  @override
  void initState() {
    super.initState();
    _focusNode.addListener(_onFocusChange);
  }

  @override
  void dispose() {
    _focusNode.removeListener(_onFocusChange);
    _focusNode.dispose();
    _debounce?.cancel();
    _removeOverlay();
    super.dispose();
  }

  void _onFocusChange() {
    if (!_focusNode.hasFocus) {
      Future.delayed(const Duration(milliseconds: 200), _removeOverlay);
    }
  }

  void _removeOverlay() {
    _overlayEntry?.remove();
    _overlayEntry = null;
  }

  void _onTextChanged(String text) {
    _debounce?.cancel();
    if (text.trim().length < 3) {
      _removeOverlay();
      return;
    }
    _debounce = Timer(const Duration(milliseconds: 400), () {
      _search(text);
    });
  }

  Future<void> _search(String query) async {
    if (query.trim().length < 3) return;

    setState(() => _isSearching = true);
    final results = await _service.searchAddressSuggestions(query);
    if (mounted) {
      setState(() {
        _suggestions = results;
        _isSearching = false;
      });
      _showOverlay();
    }
  }

  void _showOverlay() {
    _removeOverlay();

    if (_suggestions.isEmpty) return;

    _overlayEntry = OverlayEntry(
      builder: (context) => _SuggestionsOverlay(
        layerLink: _layerLink,
        suggestions: _suggestions,
        onSelect: _onSelect,
      ),
    );
    Overlay.of(context).insert(_overlayEntry!);
  }

  void _onSelect(LocationResult result) {
    final address = result.address ?? '';
    widget.addressController.text = address;
    widget.latController.text = result.latitude.toStringAsFixed(6);
    widget.lngController.text = result.longitude.toStringAsFixed(6);
    widget.onAddressSelected?.call(address);
    _removeOverlay();
    _suggestions = [];
  }

  @override
  Widget build(BuildContext context) {
    return CompositedTransformTarget(
      link: _layerLink,
      child: TextFormField(
        controller: widget.addressController,
        focusNode: _focusNode,
        decoration: InputDecoration(
          labelText: widget.labelText,
          hintText: widget.hintText,
          suffixIcon: _isSearching
              ? const Padding(
                  padding: EdgeInsets.all(12),
                  child: SizedBox(
                    width: 24,
                    height: 24,
                    child: CircularProgressIndicator(strokeWidth: 2),
                  ),
                )
              : const Icon(Icons.search),
        ),
        onChanged: _onTextChanged,
        validator: widget.validator,
      ),
    );
  }
}

class _SuggestionsOverlay extends StatelessWidget {
  const _SuggestionsOverlay({
    required this.layerLink,
    required this.suggestions,
    required this.onSelect,
  });

  final LayerLink layerLink;
  final List<LocationResult> suggestions;
  final void Function(LocationResult) onSelect;

  @override
  Widget build(BuildContext context) {
    return Positioned(
      width: _getFieldWidth(context),
      child: CompositedTransformFollower(
        link: layerLink,
        showWhenUnlinked: false,
        offset: const Offset(0, 56),
        child: Material(
          elevation: 8,
          borderRadius: BorderRadius.circular(8),
          child: ConstrainedBox(
            constraints: const BoxConstraints(maxHeight: 250),
            child: ListView.builder(
              padding: EdgeInsets.zero,
              shrinkWrap: true,
              itemCount: suggestions.length,
              itemBuilder: (context, index) {
                final result = suggestions[index];
                return ListTile(
                  leading: const Icon(Icons.place, size: 20),
                  title: Text(
                    result.address ?? '',
                    style: const TextStyle(fontSize: 14),
                    maxLines: 2,
                    overflow: TextOverflow.ellipsis,
                  ),
                  onTap: () => onSelect(result),
                );
              },
            ),
          ),
        ),
      ),
    );
  }

  double _getFieldWidth(BuildContext context) {
    final padding = MediaQuery.of(context).padding;
    final width = MediaQuery.of(context).size.width;
    return width - padding.left - padding.right - 40;
  }
}
