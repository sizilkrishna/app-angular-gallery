// Import the core angular services.
import { Component } from "@angular/core";
import { DomSanitizer } from "@angular/platform-browser";
import { SafeUrl } from "@angular/platform-browser";
import { MatSliderChange } from '@angular/material/slider';
import { DataService } from 'src/app/services/data.service';
import { RawImportData } from 'src/app/models/common/raw-import-data';
import { Artdata } from 'src/app/models/artdata';
import { GlobalVariables } from 'src/app/utils/globalvars';

// ----------------------------------------------------------------------------------- //
// ----------------------------------------------------------------------------------- //

@Component({
    selector: "my-app",
    host: {
        "(window:paste)": "handlePaste( $event )"
    },
    styleUrls: ["./paste.component.scss"],
    templateUrl: './paste.component.html'
})
export class PasteComponent {

    arts: RawImportData<Artdata> = new RawImportData();

    ngOnInit() {
        this.dataService.getArtsAPI<RawImportData<Artdata>>('all', '', '1', '99')
            .subscribe((data: RawImportData<Artdata>) => {
                this.arts = data;
            },
                err => {
                    throw ("Can't connect to Server.");
                }
            );
    }
    onInputChange(event: MatSliderChange) {
        console.log("This is emitted as the thumb slides");
        console.log(event.value);
    }

    getDataserverURL(): string {
        return GlobalVariables.BASE_DATA_SERVER;
    }
    public imageUrls: SafeUrl[];

    private lastObjectUrl: string;
    private sanitizer: DomSanitizer;

    // I initialize the app component.
    constructor(sanitizer: DomSanitizer,
        public dataService: DataService) {

        this.sanitizer = sanitizer;

        this.imageUrls = [];
        this.lastObjectUrl = "";

    }

    // ---
    // PUBLIC METHODS.
    // ---

    // I handle the paste event on the Window (see host bindings).
    public handlePaste(event: ClipboardEvent): void {

        var pastedImage = this.getPastedImage(event);

        if (!pastedImage) {

            return;

        }

        // When we create Object URLs, the browser will keep them in memory until the
        // document is unloaded or until the URL is explicitly released. Since we are
        // going to create a new URL every time the user pastes an image into the app (in
        // this particular demo), we need to be sure to release the previous Object URL
        // before we create the new one.
        // --
        // NOTE: One the Image is rendered in the DOM, releasing the Object URL will not
        // affect the rendering.
        if (this.lastObjectUrl) {

            URL.revokeObjectURL(this.lastObjectUrl);

        }

        // At this point, the "pastedImage" is a File object, which is a specialized type
        // of "Blob". We can now generate a "blob:" URL using the given File.
        this.lastObjectUrl = URL.createObjectURL(pastedImage);

        // By default, Angular WILL NOT TRUST this "blob:" style URLs. However, since we
        // know these are going to be expected, we can use the DOM Sanitizer to bypass
        // the security checks on these images.
        // --
        // NOTE: The sanitizer doesn't return Strings - it returns SafeUrls. 
        this.imageUrls.unshift(
            this.sanitizer.bypassSecurityTrustUrl(this.lastObjectUrl)
        );

    }

    // ---
    // PRIVATE METHODS.
    // ---

    // I return the first Image File from the given paste event (or null).
    private getPastedImage(event: ClipboardEvent): File | null {

        // NOTE: I am not very familiar with the Paste Event. As such, I am probably
        // being more cautious here than I need to be. However, in an abundance of
        // caution, I am checking each part of the targeted object path.
        if (
            event.clipboardData &&
            event.clipboardData.files &&
            event.clipboardData.files.length &&
            this.isImageFile(event.clipboardData.files[0])
        ) {

            return (event.clipboardData.files[0]);

        }

        return (null);

    }


    // I determine if the given File is an Image (according do its Mime-Type).
    private isImageFile(file: File): boolean {

        return (file.type.search(/^image\//i) === 0);

    }

}